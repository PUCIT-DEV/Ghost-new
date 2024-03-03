import React from 'react';
import {withErrorBoundary} from '@tryghost/admin-x-design-system';

const CustomFieldToggle: React.FC<{
    icon?: URL,
    name: string,
    type?: string,
    placeholder?: string,
    enabled: boolean
}> = ({
    icon,
    name,
    type,
    enabled
}) => {
    return (
        <div>
            <div>
                <img src={icon} />
                <div>
                    <strong>
                        {name}
                    </strong>
                    <p>
                        {type}
                    </p>
                </div>
            </div>
            <div>
                {enabled ? 'Enabled' : 'Disabled'}
            </div>
        </div>
    );
};

export default withErrorBoundary(CustomFieldToggle, 'Custom Field Toggle');
