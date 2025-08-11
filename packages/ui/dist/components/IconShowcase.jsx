import React from 'react';
import { Bitcoin, Camera, Eye, } from 'lucide-react';
export default function IconShowcase() {
    return (<div className="p-6 bg-gray-800 rounded-lg">
      <h3 className="text-xl font-bold mb-4 text-white">
        Icon Boldness Options
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* Default icons */}
        <div className="text-center">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Default</h4>
          <div className="flex flex-col items-center gap-2">
            <Bitcoin size={32} className="text-orange-500"/>
            <Camera size={32} className="text-blue-500"/>
            <Eye size={32} className="text-green-500"/>
          </div>
        </div>

        {/* Bold icons */}
        <div className="text-center">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Bold</h4>
          <div className="flex flex-col items-center gap-2">
            <Bitcoin size={32} className="text-orange-500 icon-bold"/>
            <Camera size={32} className="text-blue-500 icon-bold"/>
            <Eye size={32} className="text-green-500 icon-bold"/>
          </div>
        </div>

        {/* Extra bold icons */}
        <div className="text-center">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Extra Bold</h4>
          <div className="flex flex-col items-center gap-2">
            <Bitcoin size={32} className="text-orange-500 icon-extra-bold"/>
            <Camera size={32} className="text-blue-500 icon-extra-bold"/>
            <Eye size={32} className="text-green-500 icon-extra-bold"/>
          </div>
        </div>

        {/* Super bold icons */}
        <div className="text-center">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Super Bold</h4>
          <div className="flex flex-col items-center gap-2">
            <Bitcoin size={32} className="text-orange-500 icon-super-bold"/>
            <Camera size={32} className="text-blue-500 icon-super-bold"/>
            <Eye size={32} className="text-green-500 icon-super-bold"/>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-700 rounded">
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          Usage Examples:
        </h4>
        <div className="text-xs text-gray-400 space-y-1">
          <p>
            • <code>className="icon-bold"</code> - Makes icons bolder
          </p>
          <p>
            • <code>className="icon-extra-bold"</code> - Makes icons extra bold
          </p>
          <p>
            • <code>className="icon-super-bold"</code> - Makes icons super bold
          </p>
          <p>
            • <code>renderBoldStyledIcon('fas fa-bitcoin', 'extra-bold')</code>{' '}
            - Programmatic bold styling
          </p>
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=IconShowcase.jsx.map