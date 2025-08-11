# Bitcoin Transaction Creator - Design System Reference

## 🎨 Color Palette

### Primary Colors

```css
--color-primary: #f7931a; /* Bitcoin Orange */
--color-primary-dark: #e68207; /* Dark Orange */
--color-primary-light: #fef3c7; /* Light Orange */
```

### Status Colors

```css
--color-success: #10b981; /* Green */
--color-warning: #f59e0b; /* Amber */
--color-error: #ef4444; /* Red */
```

### Gray Scale

```css
--color-gray-50: #f9fafb; /* Lightest */
--color-gray-100: #f3f4f6;
--color-gray-200: #e5e7eb;
--color-gray-300: #d1d5db;
--color-gray-400: #9ca3af;
--color-gray-500: #6b7280;
--color-gray-600: #4b5563;
--color-gray-700: #374151;
--color-gray-800: #1f2937;
--color-gray-900: #111827; /* Darkest */
```

### Background Colors

```css
--background: linear-gradient(135deg, #1a202c, #2d3748);
--card-bg: rgba(30, 41, 59, 0.8);
```

## 📏 Spacing Scale

```css
--spacing-xs: 0.25rem; /* 4px */
--spacing-sm: 0.5rem; /* 8px */
--spacing-md: 1rem; /* 16px */
--spacing-lg: 1.5rem; /* 24px */
--spacing-xl: 2rem; /* 32px */
--spacing-2xl: 3rem; /* 48px */
```

## 🔤 Typography

### Font Family

```css
font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
```

### Font Sizes

```css
--font-size-xs: 0.75rem; /* 12px */
--font-size-sm: 0.875rem; /* 14px */
--font-size-md: 1rem; /* 16px */
--font-size-lg: 1.125rem; /* 18px */
--font-size-xl: 1.25rem; /* 20px */
--font-size-2xl: 1.5rem; /* 24px */
```

### Line Height

```css
line-height: 1.6; /* Default */
line-height: 1.4; /* Compact */
line-height: 1.2; /* Tight */
```

## 🔲 Border Radius

```css
--radius-sm: 0.375rem; /* 6px */
--radius-md: 0.5rem; /* 8px */
--radius-lg: 0.75rem; /* 12px */
--radius-xl: 1rem; /* 16px */
```

## 🌟 Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
```

## 🧩 Component Library

### Card Component

**Variants:**

- `default` - Standard card with glassmorphism
- `elevated` - Raised with hover effects
- `outlined` - Transparent with border

**Padding Options:**

- `sm` - 16px padding
- `md` - 24px padding
- `lg` - 32px padding (default)
- `xl` - 48px padding

**Usage:**

```tsx
<Card title="Title" icon="fas fa-icon" variant="elevated" padding="lg">
  Content
</Card>
```

### Button Component

**Variants:**

- `primary` - Bitcoin orange background
- `secondary` - Transparent with hover
- `ghost` - Minimal styling
- `danger` - Red background

**Sizes:**

- `sm` - 32px height
- `md` - 40px height (default)
- `lg` - 48px height

**States:**

- `loading` - Shows spinner
- `disabled` - Reduced opacity

**Usage:**

```tsx
<Button variant="primary" size="md" icon="fas fa-icon" loading={false}>
  Button Text
</Button>
```

### Input Component

**Variants:**

- `default` - Standard dark background
- `outlined` - Transparent with border
- `filled` - Darker background

**Sizes:**

- `sm` - 32px height
- `md` - 40px height (default)
- `lg` - 48px height

**Features:**

- Error states
- Helper text
- Icon support
- Label hiding option

**Usage:**

```tsx
<Input
  label="Label"
  icon="fas fa-icon"
  variant="default"
  size="md"
  error="Error message"
  helperText="Helper text"
/>
```

### TextArea Component

**Similar to Input but with:**

- Resizable (vertical only)
- Minimum heights: 80px (sm), 100px (md), 120px (lg)
- Monospace font for code display

**Usage:**

```tsx
<TextArea label="Label" rows={4} variant="default" size="md" />
```

### Tab Component

**Structure:**

```tsx
<TabContainer defaultTab="tab1">
  <TabNavigation>
    <TabButton tabId="tab1">Tab 1</TabButton>
    <TabButton tabId="tab2">Tab 2</TabButton>
  </TabNavigation>
  <TabContent tabId="tab1">Content 1</TabContent>
  <TabContent tabId="tab2">Content 2</TabContent>
</TabContainer>
```

## 🎯 Layout Patterns

### Header

```tsx
<header className="text-center mb-8 py-6 relative">
  <div className="network-indicator">TESTNET</div>
  <div className="logo">
    <i className="fab fa-bitcoin"></i>
  </div>
  <h1>Bitcoin Transaction Creator</h1>
  <p className="subtitle">Description</p>
</header>
```

### Form Layout

```tsx
<form>
  <div className="input-group">
    <Input label="Field" />
  </div>
  <div className="summary">
    <div className="summary-item">
      <span>Label</span>
      <span className="value">Value</span>
    </div>
  </div>
  <div className="btn-container">
    <Button>Action</Button>
  </div>
</form>
```

### Card Layout

```tsx
<Card title="Section Title" icon="fas fa-icon">
  <div className="space-y-4">{/* Content */}</div>
</Card>
```

## 🎨 Visual Effects

### Glassmorphism

```css
background: rgba(30, 41, 59, 0.8);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.1);
```

### Hover Effects

```css
transition: all 0.2s ease;
transform: translateY(-1px);
box-shadow: var(--shadow-md);
```

### Focus States

```css
outline: 2px solid var(--color-primary);
outline-offset: 2px;
```

### Loading Animation

```css
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

## 📱 Responsive Design

### Breakpoints

- Mobile: < 768px
- Desktop: ≥ 768px

### Mobile Adjustments

```css
@media (max-width: 768px) {
  .amount-container {
    flex-direction: column;
  }
  .btn-container {
    flex-direction: column;
  }
  .feeButtonsContainer {
    flex-wrap: wrap;
  }
}
```

## 🎭 Status Messages

### Success

```tsx
<Status message="Success message" type="success" />
```

### Error

```tsx
<Status message="Error message" type="error" />
```

### Warning

```tsx
<Status message="Warning message" type="warning" />
```

## 🔧 Utility Functions

### Class Name Utility

```tsx
import { cn } from '../utils/styles';

// Combine classes
className={cn(styles.base, styles.variant, className)}

// Conditional classes
className={cn(styles.base, isActive && styles.active)}
```

### Style Helpers

```tsx
// Create variant class
createVariantClass('button', 'primary'); // "button button--primary"

// Create size class
createSizeClass('input', 'md'); // "input input--md"

// Conditional class
conditionalClass(isActive, 'active', 'inactive');
```

## 🎨 Common Patterns

### Input with Button

```tsx
<div className="input-with-button">
  <Input label="Address" />
  <Button variant="secondary">Fetch UTXOs</Button>
</div>
```

### Fee Rate Buttons

```tsx
<div className="feeButtonsContainer">
  {feeRateOptions.map((option) => (
    <Button
      key={option.value}
      variant={selectedRate === option.value ? 'primary' : 'secondary'}
      className="feeButton"
    >
      <div className="text-center">
        <div className="font-medium">{option.label}</div>
        <div className="text-xs text-gray-400">{option.description}</div>
      </div>
    </Button>
  ))}
</div>
```

### Tab Navigation

```tsx
<div className="tab-navigation">
  <button className="tab-button active">
    <i className="fas fa-icon"></i>
    Tab Label
  </button>
</div>
```

### Summary Items

```tsx
<div className="summary">
  <div className="summary-item">
    <div>Label</div>
    <div className="value">Value</div>
  </div>
</div>
```

## 🎯 Accessibility Guidelines

### Focus Management

- All interactive elements have focus states
- Keyboard navigation support
- Screen reader friendly labels

### Color Contrast

- Minimum 4.5:1 contrast ratio
- Status colors meet WCAG guidelines
- High contrast mode considerations

### Semantic HTML

- Proper heading hierarchy
- Descriptive labels and alt text
- ARIA attributes where needed

## 📋 Quick Reference

### Common Icons

```css
fas fa-bitcoin      /* Bitcoin logo */
fas fa-wallet       /* Wallet */
fas fa-user         /* User/Address */
fas fa-coins        /* Amount */
fas fa-gas-pump     /* Fee */
fas fa-file-code    /* PSBT */
fas fa-qrcode       /* QR Code */
fas fa-copy         /* Copy */
fas fa-download     /* Download */
fas fa-sync-alt     /* Refresh */
fas fa-info-circle  /* Information */
fas fa-check-circle /* Success */
fas fa-exclamation-circle /* Error */
fas fa-exclamation-triangle /* Warning */
```

### Common Class Names

```css
.container          /* Main container */
/* Main container */
/* Main container */
/* Main container */
.input-group       /* Form field group */
.input-with-button /* Input + button layout */
.amount-container  /* Amount input layout */
.summary           /* Summary section */
.summary-item      /* Summary row */
.btn-container     /* Button group */
.tab-navigation    /* Tab navigation */
.tab-button        /* Tab button */
.step              /* Step component */
.step-number       /* Step number */
.network-indicator /* Network badge */
.balance-display   /* Balance display */
.transaction-output /* Transaction output */
.qr-container; /* QR code container */
```

This design system provides a consistent, accessible, and Bitcoin-themed interface for the transaction creator application.
