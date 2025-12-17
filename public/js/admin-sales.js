// Admin Sales Form JavaScript
// Handles product search, line items management, and totals calculation

let lineItemIndex = 0

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
  initializeLineItems()
  initializeProductSearch()
  initializeTotalsCalculation()
})

// Initialize line items - set index based on existing items
function initializeLineItems () {
  const existingRows = document.querySelectorAll('.line-item-row')
  if (existingRows.length > 0) {
    lineItemIndex = existingRows.length
  }
}

// Initialize product search
function initializeProductSearch () {
  const searchInput = document.getElementById('productSearch')
  const searchBtn = document.getElementById('searchProductBtn')
  const resultsDiv = document.getElementById('productSearchResults')
  const resultsList = document.getElementById('productResultsList')

  if (!searchInput || !searchBtn) return

  // Search on button click
  searchBtn.addEventListener('click', function () {
    performProductSearch(searchInput.value.trim())
  })

  // Search on Enter key
  searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      performProductSearch(searchInput.value.trim())
    }
  })

  // Hide results when clicking outside
  document.addEventListener('click', function (e) {
    if (
      !searchInput.contains(e.target) &&
      !resultsDiv.contains(e.target) &&
      !searchBtn.contains(e.target)
    ) {
      resultsDiv.style.display = 'none'
    }
  })
}

// Perform product search via API
function performProductSearch (query) {
  const resultsDiv = document.getElementById('productSearchResults')
  const resultsList = document.getElementById('productResultsList')

  if (!query || query.length < 1) {
    resultsDiv.style.display = 'none'
    return
  }

  // Show loading
  resultsList.innerHTML = '<div class="list-group-item">Searching...</div>'
  resultsDiv.style.display = 'block'

  // Fetch products
  fetch(`/admin/api/products?query=${encodeURIComponent(query)}&limit=10`)
    .then(response => response.json())
    .then(products => {
      if (products.length === 0) {
        resultsList.innerHTML =
          '<div class="list-group-item text-muted">No products found</div>'
        return
      }

      resultsList.innerHTML = ''
      products.forEach(product => {
        const item = document.createElement('a')
        item.href = '#'
        item.className = 'list-group-item list-group-item-action'
        item.innerHTML = `
          <div class="d-flex justify-content-between">
            <div>
              <strong>${escapeHtml(product.name)}</strong>
              ${
                product.sku
                  ? `<br><small class="text-muted">SKU: ${escapeHtml(
                      product.sku
                    )}</small>`
                  : ''
              }
              ${
                product.description
                  ? `<br><small class="text-muted">${escapeHtml(
                      product.description.substring(0, 50)
                    )}${product.description.length > 50 ? '...' : ''}</small>`
                  : ''
              }
            </div>
            <div class="text-end">
              <strong>$${product.price.toFixed(2)}</strong>
              <br><small class="text-muted">${
                product.taxable ? 'Taxable' : 'Non-taxable'
              }</small>
            </div>
          </div>
        `
        item.addEventListener('click', function (e) {
          e.preventDefault()
          addLineItem(product)
          document.getElementById('productSearch').value = ''
          resultsDiv.style.display = 'none'
        })
        resultsList.appendChild(item)
      })
    })
    .catch(error => {
      console.error('Product search error:', error)
      resultsList.innerHTML =
        '<div class="list-group-item text-danger">Error searching products</div>'
    })
}

// Add a line item from a product
function addLineItem (product) {
  const tbody = document.getElementById('lineItemsBody')
  const noItemsRow = document.getElementById('noItemsRow')

  // Remove "no items" row if present
  if (noItemsRow) {
    noItemsRow.remove()
  }

  // Create new row
  const row = document.createElement('tr')
  row.className = 'line-item-row'
  row.setAttribute('data-index', lineItemIndex)

  const productName = product.name || ''
  const productSku = product.sku || ''
  const productDescription = product.description || ''
  const unitPrice = product.price || 0
  const taxable = product.taxable !== false

  row.innerHTML = `
    <td>
      <input type="hidden" name="lineItems[${lineItemIndex}][productId]" value="${
    product._id || ''
  }">
      <input type="hidden" name="lineItems[${lineItemIndex}][name]" value="${escapeHtml(
    productName
  )}">
      <input type="hidden" name="lineItems[${lineItemIndex}][sku]" value="${escapeHtml(
    productSku
  )}">
      <input type="hidden" name="lineItems[${lineItemIndex}][description]" value="${escapeHtml(
    productDescription
  )}">
      <strong>${escapeHtml(productName)}</strong>
      ${
        productSku
          ? `<br><small class="text-muted">SKU: ${escapeHtml(
              productSku
            )}</small>`
          : ''
      }
    </td>
    <td>
      <input type="number" step="0.01" min="0" class="form-control form-control-sm unit-price" name="lineItems[${lineItemIndex}][unitPrice]" value="${unitPrice.toFixed(
    2
  )}" required>
    </td>
    <td>
      <input type="number" min="1" class="form-control form-control-sm quantity" name="lineItems[${lineItemIndex}][quantity]" value="1" required>
    </td>
    <td>
      <input type="checkbox" class="form-check-input taxable" name="lineItems[${lineItemIndex}][taxable]" value="true" ${
    taxable ? 'checked' : ''
  }>
    </td>
    <td class="line-total">$0.00</td>
    <td>
      <button type="button" class="btn btn-sm btn-outline-danger remove-line-item">Remove</button>
    </td>
  `

  tbody.appendChild(row)

  // Attach event listeners
  attachLineItemListeners(row)

  // Update totals
  updateAllTotals()

  lineItemIndex++
}

// Attach event listeners to a line item row
function attachLineItemListeners (row) {
  const unitPriceInput = row.querySelector('.unit-price')
  const quantityInput = row.querySelector('.quantity')
  const taxableCheckbox = row.querySelector('.taxable')
  const removeBtn = row.querySelector('.remove-line-item')

  // Update totals when values change
  ;[unitPriceInput, quantityInput, taxableCheckbox].forEach(element => {
    element.addEventListener('input', updateAllTotals)
    element.addEventListener('change', updateAllTotals)
  })

  // Remove line item
  removeBtn.addEventListener('click', function () {
    row.remove()
    updateAllTotals()

    // Show "no items" message if table is empty
    const tbody = document.getElementById('lineItemsBody')
    if (tbody.children.length === 0) {
      const noItemsRow = document.createElement('tr')
      noItemsRow.id = 'noItemsRow'
      noItemsRow.innerHTML =
        '<td colspan="6" class="text-center text-muted">No line items. Search and add products above.</td>'
      tbody.appendChild(noItemsRow)
    }
  })
}

// Initialize totals calculation
function initializeTotalsCalculation () {
  const taxRateInput = document.getElementById('taxRate')
  if (taxRateInput) {
    taxRateInput.addEventListener('input', updateAllTotals)
    taxRateInput.addEventListener('change', updateAllTotals)
  }

  // Attach listeners to existing line items
  document.querySelectorAll('.line-item-row').forEach(row => {
    attachLineItemListeners(row)
  })

  // Initial calculation
  updateAllTotals()
}

// Update all totals (subtotal, tax, grand total)
function updateAllTotals () {
  const taxRateInput = document.getElementById('taxRate')
  const taxRate =
    parseFloat(taxRateInput ? taxRateInput.value : 0.0625) || 0.0625

  let subtotal = 0
  let taxTotal = 0

  // Calculate each line item
  document.querySelectorAll('.line-item-row').forEach(row => {
    const unitPrice = parseFloat(row.querySelector('.unit-price').value) || 0
    const quantity = parseInt(row.querySelector('.quantity').value) || 1
    const taxable = row.querySelector('.taxable').checked

    const lineSubtotal = unitPrice * quantity
    const lineTax = taxable ? lineSubtotal * taxRate : 0
    const lineTotal = lineSubtotal + lineTax

    // Update line total display
    const lineTotalCell = row.querySelector('.line-total')
    if (lineTotalCell) {
      lineTotalCell.textContent = '$' + lineTotal.toFixed(2)
    }

    subtotal += lineSubtotal
    taxTotal += lineTax
  })

  // Round to 2 decimal places
  subtotal = Math.round(subtotal * 100) / 100
  taxTotal = Math.round(taxTotal * 100) / 100
  const total = Math.round((subtotal + taxTotal) * 100) / 100

  // Update preview totals
  const previewSubtotal = document.getElementById('previewSubtotal')
  const previewTaxTotal = document.getElementById('previewTaxTotal')
  const previewTotal = document.getElementById('previewTotal')

  if (previewSubtotal) previewSubtotal.textContent = '$' + subtotal.toFixed(2)
  if (previewTaxTotal) previewTaxTotal.textContent = '$' + taxTotal.toFixed(2)
  if (previewTotal) previewTotal.textContent = '$' + total.toFixed(2)
}

// Escape HTML to prevent XSS
function escapeHtml (text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Form validation before submit
const saleForm = document.getElementById('saleForm')
if (saleForm) {
  saleForm.addEventListener('submit', function (e) {
    const lineItems = document.querySelectorAll('.line-item-row')
    if (lineItems.length === 0) {
      e.preventDefault()
      alert('Please add at least one line item to the sale.')
      return false
    }

    // Validate all line items have required fields
    let isValid = true
    lineItems.forEach(row => {
      const unitPrice = parseFloat(row.querySelector('.unit-price').value)
      const quantity = parseInt(row.querySelector('.quantity').value)

      if (!unitPrice || unitPrice <= 0) {
        isValid = false
      }
      if (!quantity || quantity < 1) {
        isValid = false
      }
    })

    if (!isValid) {
      e.preventDefault()
      alert('Please ensure all line items have valid unit price and quantity.')
      return false
    }
  })
}
