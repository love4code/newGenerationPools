// Admin Sales Form JavaScript
// Handles product search, line items management, and totals calculation

let lineItemIndex = 0
let searchTimeout = null

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
  initializeLineItems()
  initializeProductSearch()
  initializeTotalsCalculation()
  initializeCustomProductForm()
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

  // Search as user types (with debounce)
  searchInput.addEventListener('input', function () {
    const query = searchInput.value.trim()

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    // If query is empty, hide results
    if (!query || query.length < 1) {
      resultsDiv.style.display = 'none'
      return
    }

    // Debounce: wait 300ms after user stops typing before searching
    searchTimeout = setTimeout(function () {
      performProductSearch(query)
    }, 300)
  })

  // Search on button click (immediate, no debounce)
  searchBtn.addEventListener('click', function () {
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }
    performProductSearch(searchInput.value.trim())
  })

  // Search on Enter key (immediate, no debounce)
  searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (searchTimeout) {
        clearTimeout(searchTimeout)
      }
      performProductSearch(searchInput.value.trim())
    }
  })

  // Show results when input is focused and has value
  searchInput.addEventListener('focus', function () {
    const query = searchInput.value.trim()
    if (query && query.length > 0) {
      performProductSearch(query)
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
  fetch(`/admin/api/products?query=${encodeURIComponent(query)}&limit=20`)
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
        item.style.cursor = 'pointer'
        item.innerHTML = `
          <div class="d-flex justify-content-between align-items-center">
            <div class="flex-grow-1">
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
            <div class="text-end ms-3">
              <strong class="text-primary">$${product.price.toFixed(2)}</strong>
              ${
                product.costPrice
                  ? `<br><small class="text-muted">Cost: $${product.costPrice.toFixed(
                      2
                    )}</small>`
                  : ''
              }
              <br><small class="badge bg-${
                product.taxable ? 'success' : 'secondary'
              }">${product.taxable ? 'Taxable' : 'Non-taxable'}</small>
            </div>
          </div>
        `
        item.addEventListener('click', function (e) {
          e.preventDefault()
          addLineItem(product)
          document.getElementById('productSearch').value = ''
          resultsDiv.style.display = 'none'
        })

        // Add hover effect
        item.addEventListener('mouseenter', function () {
          this.style.backgroundColor = '#f8f9fa'
        })
        item.addEventListener('mouseleave', function () {
          this.style.backgroundColor = ''
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
function addLineItem (product, initialQuantity = null) {
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
  const unitCost = product.costPrice || 0
  const taxable = product.taxable !== false
  const quantity =
    initialQuantity !== null ? initialQuantity : product.quantity || 1

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
      <input type="number" step="0.01" min="0" class="form-control form-control-sm unit-cost" name="lineItems[${lineItemIndex}][unitCost]" value="${unitCost.toFixed(
    2
  )}">
    </td>
    <td>
      <input type="number" min="1" class="form-control form-control-sm quantity" name="lineItems[${lineItemIndex}][quantity]" value="${quantity}" required>
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
  const unitCostInput = row.querySelector('.unit-cost')
  const quantityInput = row.querySelector('.quantity')
  const taxableCheckbox = row.querySelector('.taxable')
  const removeBtn = row.querySelector('.remove-line-item')

  // Update totals when values change
  ;[unitPriceInput, unitCostInput, quantityInput, taxableCheckbox].forEach(
    element => {
      if (element) {
        element.addEventListener('input', updateAllTotals)
        element.addEventListener('change', updateAllTotals)
      }
    }
  )

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
        '<td colspan="7" class="text-center text-muted">No line items. Search and add products above.</td>'
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

// Update all totals (subtotal, tax, grand total, cost, profit)
function updateAllTotals () {
  const taxRateInput = document.getElementById('taxRate')
  const taxRate =
    parseFloat(taxRateInput ? taxRateInput.value : 0.0625) || 0.0625

  let subtotal = 0
  let totalCost = 0
  let taxTotal = 0

  // Calculate each line item
  document.querySelectorAll('.line-item-row').forEach(row => {
    const unitPrice = parseFloat(row.querySelector('.unit-price').value) || 0
    const unitCostInput = row.querySelector('.unit-cost')
    const unitCost = parseFloat(unitCostInput ? unitCostInput.value : 0) || 0
    const quantity = parseInt(row.querySelector('.quantity').value) || 1
    const taxable = row.querySelector('.taxable').checked

    const lineSubtotal = unitPrice * quantity
    const lineCost = unitCost * quantity
    const lineTax = taxable ? lineSubtotal * taxRate : 0
    const lineTotal = lineSubtotal + lineTax

    // Update line total display
    const lineTotalCell = row.querySelector('.line-total')
    if (lineTotalCell) {
      lineTotalCell.textContent = '$' + lineTotal.toFixed(2)
    }

    subtotal += lineSubtotal
    totalCost += lineCost
    taxTotal += lineTax
  })

  // Round to 2 decimal places
  subtotal = Math.round(subtotal * 100) / 100
  totalCost = Math.round(totalCost * 100) / 100
  taxTotal = Math.round(taxTotal * 100) / 100
  const total = Math.round((subtotal + taxTotal) * 100) / 100
  const totalProfit = Math.round((total - totalCost) * 100) / 100

  // Update preview totals
  const previewSubtotal = document.getElementById('previewSubtotal')
  const previewTaxTotal = document.getElementById('previewTaxTotal')
  const previewTotal = document.getElementById('previewTotal')
  const previewTotalCost = document.getElementById('previewTotalCost')
  const previewTotalProfit = document.getElementById('previewTotalProfit')

  if (previewSubtotal) previewSubtotal.textContent = '$' + subtotal.toFixed(2)
  if (previewTaxTotal) previewTaxTotal.textContent = '$' + taxTotal.toFixed(2)
  if (previewTotal) previewTotal.textContent = '$' + total.toFixed(2)
  if (previewTotalCost)
    previewTotalCost.textContent = '$' + totalCost.toFixed(2)
  if (previewTotalProfit)
    previewTotalProfit.textContent = '$' + totalProfit.toFixed(2)
}

// Escape HTML to prevent XSS
function escapeHtml (text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Initialize custom product form
function initializeCustomProductForm () {
  const toggleBtn = document.getElementById('toggleCustomProductBtn')
  const closeBtn = document.getElementById('closeCustomProductBtn')
  const cancelBtn = document.getElementById('cancelCustomProductBtn')
  const addBtn = document.getElementById('addCustomProductBtn')
  const customForm = document.getElementById('customProductForm')

  if (!toggleBtn || !customForm) return

  // Toggle form visibility
  toggleBtn.addEventListener('click', function () {
    customForm.style.display =
      customForm.style.display === 'none' ? 'block' : 'block'
    customForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })

  // Close form
  function closeForm () {
    customForm.style.display = 'none'
    clearCustomProductForm()
  }

  if (closeBtn) closeBtn.addEventListener('click', closeForm)
  if (cancelBtn) cancelBtn.addEventListener('click', closeForm)

  // Add custom product
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      addCustomProduct()
    })
  }

  // Allow Enter key to submit custom product form
  const customInputs = customForm.querySelectorAll('input, textarea')
  customInputs.forEach(input => {
    input.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' && e.target.id === 'customProductName') {
        e.preventDefault()
        addCustomProduct()
      }
    })
  })
}

// Add custom product to line items
async function addCustomProduct () {
  const nameInput = document.getElementById('customProductName')
  const skuInput = document.getElementById('customProductSku')
  const priceInput = document.getElementById('customProductPrice')
  const costInput = document.getElementById('customProductCost')
  const quantityInput = document.getElementById('customProductQuantity')
  const taxableInput = document.getElementById('customProductTaxable')
  const descriptionInput = document.getElementById('customProductDescription')
  const addBtn = document.getElementById('addCustomProductBtn')

  // Validate required fields
  const name = nameInput.value.trim()
  const price = parseFloat(priceInput.value) || 0
  const quantity = parseInt(quantityInput.value) || 1

  if (!name) {
    alert('Please enter a product name.')
    nameInput.focus()
    return
  }

  if (price <= 0) {
    alert('Please enter a valid unit price.')
    priceInput.focus()
    return
  }

  if (quantity < 1) {
    alert('Please enter a valid quantity.')
    quantityInput.focus()
    return
  }

  // Disable button and show loading
  const originalBtnText = addBtn.innerHTML
  addBtn.disabled = true
  addBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm me-1"></span> Saving...'

  try {
    // Save product to database
    const productData = {
      name: name,
      sku: skuInput.value.trim() || '',
      description: descriptionInput.value.trim() || '',
      price: price,
      costPrice: parseFloat(costInput.value) || 0,
      taxable: taxableInput.checked
    }

    const response = await fetch('/admin/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to save product')
    }

    const savedProduct = await response.json()

    // Add to line items with the saved product data
    addLineItem(savedProduct, quantity)

    // Close form and clear
    document.getElementById('customProductForm').style.display = 'none'
    clearCustomProductForm()

    // Show success message
    const successMsg = document.createElement('div')
    successMsg.className =
      'alert alert-success alert-dismissible fade show mt-2'
    successMsg.innerHTML = `
      <strong>Success!</strong> Product "${name}" has been saved and added to the sale.
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `
    const formCard = document.querySelector('.card.mb-3')
    if (formCard) {
      formCard.insertAdjacentElement('afterend', successMsg)
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        successMsg.remove()
      }, 3000)
    }
  } catch (error) {
    console.error('Error saving product:', error)
    alert('Failed to save product: ' + error.message)
  } finally {
    // Re-enable button
    addBtn.disabled = false
    addBtn.innerHTML = originalBtnText
  }
}

// Clear custom product form
function clearCustomProductForm () {
  document.getElementById('customProductName').value = ''
  document.getElementById('customProductSku').value = ''
  document.getElementById('customProductPrice').value = '0'
  document.getElementById('customProductCost').value = '0'
  document.getElementById('customProductQuantity').value = '1'
  document.getElementById('customProductTaxable').checked = true
  document.getElementById('customProductDescription').value = ''
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
