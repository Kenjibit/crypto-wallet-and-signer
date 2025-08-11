/**
 * Utility function to combine class names with proper filtering
 * @param classes - Array of class names, undefined, null, or false values
 * @returns Combined class string
 */
export declare const cn: (...classes: (string | undefined | null | false)[]) => string;
/**
 * Create a variant class name
 * @param base - Base class name
 * @param variant - Variant name
 * @returns Combined class string
 */
export declare const createVariantClass: (base: string, variant: string) => string;
/**
 * Create a size class name
 * @param base - Base class name
 * @param size - Size name
 * @returns Combined class string
 */
export declare const createSizeClass: (base: string, size: string) => string;
/**
 * Create a state class name
 * @param base - Base class name
 * @param state - State name
 * @returns Combined class string
 */
export declare const createStateClass: (base: string, state: string) => string;
/**
 * Conditional class name helper
 * @param condition - Boolean condition
 * @param trueClass - Class to apply when condition is true
 * @param falseClass - Class to apply when condition is false (optional)
 * @returns Class string
 */
export declare const conditionalClass: (condition: boolean, trueClass: string, falseClass?: string) => string;
//# sourceMappingURL=styles.d.ts.map