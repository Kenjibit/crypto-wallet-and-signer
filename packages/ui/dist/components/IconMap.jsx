import { Download, X, Camera, AlertTriangle, Bitcoin, Copy, Trash, Key, Eye, EyeOff, FileSignature, Lock, FileText, FileCode, CheckCircle, RefreshCw, DollarSign, Fuel, ChevronDown, List, Edit, RadioTower, Coins, Wallet, RotateCcw, User, FileText as FileInvoice, RotateCcw as Redo, Info, Inbox, } from 'lucide-react';
// Map Font Awesome icon names to Lucide React components
export const iconMap = {
    // Download and actions
    'fas fa-download': Download,
    'fas fa-times': X,
    'fas fa-camera': Camera,
    'fas fa-exclamation-triangle': AlertTriangle,
    // Bitcoin and crypto
    'fab fa-bitcoin': Bitcoin,
    // Common actions
    'fas fa-copy': Copy,
    'fas fa-trash': Trash,
    'fas fa-key': Key,
    'fas fa-eye': Eye,
    'fas fa-eye-slash': EyeOff,
    'fas fa-signature': FileSignature,
    'fas fa-lock': Lock,
    'fas fa-file-text': FileText,
    'fas fa-file-code': FileCode,
    'fas fa-check-circle': CheckCircle,
    'fas fa-refresh': RefreshCw,
    // Financial
    'fas fa-money-bill-wave': DollarSign,
    'fas fa-gas-pump': Fuel,
    'fas fa-chevron-down': ChevronDown,
    'fas fa-list': List,
    'fas fa-edit': Edit,
    'fas fa-broadcast-tower': RadioTower,
    'fas fa-coins': Coins,
    'fas fa-wallet': Wallet,
    'fas fa-sync-alt': RotateCcw,
    // User and forms
    'fas fa-user': User,
    'fas fa-file-invoice': FileInvoice,
    'fas fa-redo': Redo,
    'fas fa-info-circle': Info,
    'fas fa-inbox': Inbox,
    // Fallback for any unmapped icons
    default: Info,
};
// Helper function to get icon component
export function getIconComponent(iconName) {
    return iconMap[iconName] || iconMap['default'];
}
// Helper function to render icon with props
export function renderIcon(iconName, props = {}) {
    const IconComponent = getIconComponent(iconName);
    return <IconComponent {...props}/>;
}
// Helper function to render bold icon with enhanced stroke width
export function renderBoldIcon(iconName, props = {}) {
    const IconComponent = getIconComponent(iconName);
    return <IconComponent {...props} strokeWidth={2.5}/>;
}
// Helper function to render extra bold icon
export function renderExtraBoldIcon(iconName, props = {}) {
    const IconComponent = getIconComponent(iconName);
    return <IconComponent {...props} strokeWidth={3}/>;
}
// Helper function to render icon with bold CSS class
export function renderBoldStyledIcon(iconName, boldLevel = 'bold', props = {}) {
    const IconComponent = getIconComponent(iconName);
    const className = `icon-${boldLevel} ${props.className || ''}`.trim();
    return <IconComponent {...props} className={className}/>;
}
//# sourceMappingURL=IconMap.jsx.map