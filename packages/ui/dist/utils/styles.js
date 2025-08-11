/**
 * Utility function to combine class names with proper filtering
 * @param classes - Array of class names, undefined, null, or false values
 * @returns Combined class string
 */
export const cn = (...classes) => {
    return classes.filter(Boolean).join(' ');
};
/**
 * Create a variant class name
 * @param base - Base class name
 * @param variant - Variant name
 * @returns Combined class string
 */
export const createVariantClass = (base, variant) => {
    return `${base} ${base}--${variant}`;
};
/**
 * Create a size class name
 * @param base - Base class name
 * @param size - Size name
 * @returns Combined class string
 */
export const createSizeClass = (base, size) => {
    return `${base} ${base}--${size}`;
};
/**
 * Create a state class name
 * @param base - Base class name
 * @param state - State name
 * @returns Combined class string
 */
export const createStateClass = (base, state) => {
    return `${base} ${base}--${state}`;
};
/**
 * Conditional class name helper
 * @param condition - Boolean condition
 * @param trueClass - Class to apply when condition is true
 * @param falseClass - Class to apply when condition is false (optional)
 * @returns Class string
 */
export const conditionalClass = (condition, trueClass, falseClass) => {
    return condition ? trueClass : falseClass || '';
};
//# sourceMappingURL=styles.js.map