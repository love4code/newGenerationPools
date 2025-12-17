# Admin Layout Structure Explanation

## How EJS Partials Work

When you use `<%- include('../partials/admin-header') %>` in a view file, EJS inserts the header content, then renders your view content, then inserts the footer.

## The Correct Structure

### admin-header.ejs (MUST leave main tag OPEN)

```html
<div class="row">
  <nav class="col-md-3 col-lg-2 sidebar">...</nav>
  <main class="col-md-9 col-lg-10 p-4">
    <!-- DO NOT CLOSE main HERE! -->
  </main>
</div>
```

### dashboard.ejs (or any view)

```html
<%- include('../partials/admin-header') %>

<!-- Your content renders HERE, inside the open <main> tag -->
<h1>Dashboard</h1>
<div class="row">...</div>

<%- include('../partials/admin-footer') %>
```

### admin-footer.ejs (closes main tag)

```html
  </main>  <!-- This closes the main tag opened in header -->
</div>
</div>
<script>...</script>
</body>
</html>
```

## What Happens When You Close main in Header

If you close `<main>` in the header, the rendered HTML becomes:

```html
<div class="row">
  <nav>...</nav>
  <main></main>  <!-- CLOSED TOO EARLY! -->
</div>
</div>
</body>
</html>
<!-- Your content renders HERE (OUTSIDE the grid!) -->
<h1>Dashboard</h1>
```

This breaks the Bootstrap grid because your content is outside the `<main>` tag, so it appears below the sidebar instead of beside it.

## The Fix

**The header MUST open `<main>` and leave it open.** The footer closes it. This is the ONLY way EJS partials work correctly.
