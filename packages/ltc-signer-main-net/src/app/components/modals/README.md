# 🎯 Modal Components Library

This folder contains reusable modal components that provide a consistent, modular foundation for creating modals across the application.

## 📁 File Structure

```
modals/
├── ModalBase.tsx          # Base modal component with header and content
├── ModalStep.tsx          # Step container and header components
├── OptionSelector.tsx     # Reusable option selection system
├── modals.css            # Shared CSS for all modal components
├── ExampleUsage.tsx      # Examples of how to use the components
├── index.ts              # Exports all components and types
└── README.md             # This file
```

## 🧩 Components

### ModalBase

**Purpose**: Foundation component for all modals
**Features**:

- Full-screen modal layout
- Standard header with back button and title
- Content area with scrolling
- Backdrop blur effect

**Props**:

- `isOpen`: Boolean to control modal visibility
- `onClose`: Function called when modal should close
- `title`: Modal title displayed in header
- `children`: Modal content
- `showBackButton`: Whether to show back button (default: true)
- `onBack`: Custom back button handler (optional, falls back to onClose if not provided)
- `className`: Additional CSS classes

### ModalStep

**Purpose**: Container for organizing modal content into logical steps
**Features**:

- Consistent step layout
- Multiple size variants
- Centered content with max-width constraints

**Props**:

- `children`: Step content
- `variant`: Size variant ('default' | 'narrow' | 'wide')
- `className`: Additional CSS classes

**Variants**:

- `default`: 800px max-width
- `narrow`: 600px max-width (good for forms)
- `wide`: 1000px max-width (good for complex content)

### ModalStepHeader

**Purpose**: Standard header for modal steps
**Features**:

- Consistent title styling
- Optional description text
- Centered layout

**Props**:

- `title`: Step title
- `description`: Optional step description
- `className`: Additional CSS classes

### OptionSelector

**Purpose**: Reusable system for creating selectable option interfaces
**Features**:

- Grid or vertical layout options
- Consistent option styling
- Selection state management
- Icon support (left and right)

**Props**:

- `options`: Array of OptionItem objects
- `selectedId`: Currently selected option ID
- `onSelect`: Function called when option is selected
- `variant`: Layout variant ('grid' | 'vertical')
- `className`: Additional CSS classes

## 🎨 CSS Classes

The components use consistent CSS classes that can be customized:

### Base Classes

- `.modal-base`: Base modal container
- `.modal-header`: Modal header area
- `.modal-content`: Modal content area
- `.modal-step`: Step container
- `.option-system`: Option grid container
- `.option-item`: Individual option item

### Variant Classes

- `.modal-step--narrow`: Narrow step variant
- `.modal-step--wide`: Wide step variant
- `.option-system--vertical`: Vertical option layout

### State Classes

- `.option-item.selected`: Selected option state
- `.option-item:hover`: Hover state
- `.option-item:disabled`: Disabled state

## 🚀 Usage Examples

### Basic Modal

```tsx
import { ModalBase } from './modals';

<ModalBase isOpen={isOpen} onClose={onClose} title="My Modal">
  <div>Your content here</div>
</ModalBase>;
```

### Modal with Steps

```tsx
import { ModalBase, ModalStep, ModalStepHeader } from './modals';

<ModalBase isOpen={isOpen} onClose={onClose} title="Multi-Step Modal">
  <ModalStep variant="narrow">
    <ModalStepHeader title="Step 1" description="This is the first step" />
    <div>Step 1 content</div>
  </ModalStep>
</ModalBase>;
```

### Modal with Options

```tsx
import {
  ModalBase,
  ModalStep,
  ModalStepHeader,
  OptionSelector,
} from './modals';

const options = [
  {
    id: 'option1',
    title: 'Option 1',
    description: 'Description for option 1',
    icon: <Icon size={24} />,
  },
];

<ModalBase isOpen={isOpen} onClose={onClose} title="Options Modal">
  <ModalStep>
    <ModalStepHeader title="Choose an Option" />
    <OptionSelector
      options={options}
      selectedId={selectedId}
      onSelect={setSelectedId}
      variant="vertical"
    />
  </ModalStep>
</ModalBase>;
```

## 🔧 Customization

### CSS Customization

All components use CSS custom properties (variables) for easy theming:

```css
:root {
  --modal-backdrop: rgba(0, 0, 0, 0.8);
  --card-bg: #ffffff;
  --card-border: #e5e7eb;
  --color-primary: #3b82f6;
  --spacing-lg: 1.5rem;
}
```

### Component Extension

Components can be extended by passing additional props or wrapping them:

```tsx
// Custom modal with additional features
const CustomModal = ({ isOpen, onClose, ...props }) => (
  <ModalBase
    isOpen={isOpen}
    onClose={onClose}
    title={props.title}
    className="custom-modal"
  >
    {/* Custom content */}
  </ModalBase>
);
```

## 📱 Responsive Design

All components are responsive by default:

- Mobile-first design approach
- Breakpoint at 768px for mobile adjustments
- Flexible layouts that adapt to screen size
- Touch-friendly interactions

## ♿ Accessibility

Components include accessibility features:

- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader compatibility

## 🧪 Testing

Components can be tested individually:

- Unit tests for component logic
- Integration tests for component interactions
- Visual regression tests for styling consistency

## 🔄 Migration Guide

### From Old Modal System

1. Replace modal container with `ModalBase`
2. Wrap content in `ModalStep` with appropriate variant
3. Use `ModalStepHeader` for step titles
4. Replace custom option systems with `OptionSelector`

### Example Migration

**Before**:

```tsx
<div className="auth-setup-modal">
  <div className="modal-header">
    <button className="back-button">←</button>
    <h2>Setup Authentication</h2>
  </div>
  <div className="modal-content">{/* Custom content */}</div>
</div>
```

**After**:

```tsx
<ModalBase
  isOpen={isOpen}
  onClose={onClose}
  title="Setup Authentication"
  className="auth-setup-modal"
>
  {/* Content */}
</ModalBase>
```

## 🤝 Contributing

When adding new modal components:

1. Follow the established patterns
2. Use consistent naming conventions
3. Include proper TypeScript types
4. Add comprehensive documentation
5. Test across different screen sizes
6. Ensure accessibility compliance

## 📚 Related Files

- `../../styles/components/modals.css`: Main modal styles
- `../../styles/design-tokens.css`: Design system variables
- `../../styles/globals.css`: Global styles and utilities
