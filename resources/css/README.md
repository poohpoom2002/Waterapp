# CSS Files for Waterapp

This directory contains the CSS files for the Waterapp project, specifically for the map-planner and generate-tree pages.

## Files Overview

### `app.css`
The main CSS file that includes:
- Tailwind CSS base, components, and utilities
- Custom theme configuration
- Dark mode support
- Imports for page-specific CSS files

### `map-planner.css`
Dedicated styles for the map planner page including:
- Map container styling with gradients and shadows
- Search control interface with autocomplete
- Area type buttons with different states
- Control panels and navigation
- Zoom controls and map type selectors
- Responsive design for mobile devices
- Dark mode enhancements
- Custom animations and transitions

### `generate-tree.css`
Dedicated styles for the generate tree page including:
- Tree map container with enhanced styling
- Sidebar panel with equipment controls
- Valve and pump management interfaces
- Zone management with color indicators
- Pipe direction controls
- Point management tools
- Undo/redo functionality
- Status indicators and loading states
- Responsive design for tablets and mobile
- Custom scrollbars and tooltips

## Usage

### In React Components

To use these styles in your React components, simply add the appropriate CSS classes to your elements:

#### Map Planner Example:
```tsx
<div className="map-planner-container">
    <div className="map-container">
        {/* Map content */}
    </div>
    <div className="search-control">
        <input className="search-input" placeholder="Search location..." />
    </div>
    <div className="area-type-buttons">
        <button className="area-type-button active">Initial</button>
        <button className="area-type-button">River</button>
    </div>
</div>
```

#### Generate Tree Example:
```tsx
<div className="generate-tree-container">
    <div className="tree-map-container">
        {/* Map content */}
    </div>
    <div className="sidebar-panel">
        <div className="sidebar-header">
            <h2 className="sidebar-title">Tree Generation</h2>
        </div>
        <div className="equipment-controls">
            <button className="equipment-button active">Valves</button>
            <button className="equipment-button">Pumps</button>
        </div>
    </div>
</div>
```

## Key Features

### Responsive Design
Both CSS files include responsive breakpoints:
- Desktop: Full layout with sidebars and overlays
- Tablet (1024px): Adjusted sidebar positioning
- Mobile (768px): Stacked controls and compact layout

### Dark Mode Support
All components support dark mode with appropriate color schemes and contrast ratios.

### Accessibility
- Focus states for all interactive elements
- Proper contrast ratios
- Keyboard navigation support
- Screen reader friendly

### Animations
- Smooth transitions for state changes
- Loading animations
- Slide and fade effects
- Hover states

## Customization

### Colors
The CSS uses CSS custom properties that can be overridden:
```css
:root {
    --color-primary: #your-color;
    --color-secondary: #your-color;
}
```

### Spacing
Uses Tailwind's spacing scale for consistent spacing throughout the application.

### Typography
Uses the custom font stack defined in the theme configuration.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox support required
- CSS Custom Properties support required
- Tailwind CSS v4 compatibility

## Development

When making changes to these files:
1. Ensure dark mode compatibility
2. Test responsive breakpoints
3. Verify accessibility features
4. Check browser compatibility
5. Update this documentation if needed 