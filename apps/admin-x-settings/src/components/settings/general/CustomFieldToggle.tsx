import React from 'react';
import {Icon} from '@tryghost/admin-x-design-system';
import {withErrorBoundary} from '@tryghost/admin-x-design-system';

const CustomFieldToggle: React.FC<{
    icon?: URL,
    name: string,
    type?: 'url' | 'short' | 'long' | 'boolean',
    placeholder?: string,
    enabled: boolean
}> = ({
    icon,
    name,
    type,
    enabled
}) => {
    let iconComponent;

    if (!icon) {
        switch (type) {
        case 'long':
            iconComponent = <Icon className='absolute left-3 top-3 z-10' colorClass='text-grey-500' name='hyperlink-circle' size='sm' />;
            break;
        case 'short':
            iconComponent = <Icon className='absolute left-3 top-3 z-10' colorClass='text-grey-500' name='hyperlink-circle' size='sm' />;
            break;
        case 'url':
            iconComponent = <Icon className='absolute left-3 top-3 z-10' colorClass='text-grey-500' name='hyperlink-circle' size='sm' />;
            break;
        case 'boolean':
            iconComponent = <Icon className='absolute left-3 top-3 z-10' colorClass='text-grey-500' name='hyperlink-circle' size='sm' />;
            break;
        default:
            break;
        }
    } else {
        iconComponent = <img className='absolute left-3 top-3 z-10' src={icon.href} />;
    }

    return (
        <div className='flex justify-between border-y-grey-250'>
            <div className='flex'>
                {iconComponent}
                <div className='wrap flex'>
                    <strong>{name}</strong>
                    <p>{type}</p>
                </div>
            </div>
            <div>
                {enabled ? 'Enabled' : 'Disabled'}
            </div>
        </div>
    );
};

export default withErrorBoundary(CustomFieldToggle, 'Custom Field Toggle');
