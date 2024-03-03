import React from 'react';
import {Icon} from '@tryghost/admin-x-design-system';
import {withErrorBoundary} from '@tryghost/admin-x-design-system';

const CustomFieldToggle: React.FC<{
    icon?: URL | null,
    name: string,
    type?: 'url' | 'short' | 'long' | 'boolean',
    placeholder?: string | null,
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
            iconComponent = <Icon className='bg-grey-150 p-4' colorClass='text-black' name='hyperlink-circle' size='sm' />;
            break;
        case 'short':
            iconComponent = <Icon className='bg-grey-150 p-4' colorClass='text-black' name='hyperlink-circle' size='sm' />;
            break;
        case 'url':
            iconComponent = <Icon className='bg-grey-150 p-4' colorClass='text-black' name='hyperlink-circle' size='sm' />;
            break;
        case 'boolean':
            iconComponent = <Icon className='bg-grey-150 p-4' colorClass='text-black' name='hyperlink-circle' size='sm' />;
            break;
        default:
            break;
        }
    } else {
        iconComponent = <img className='bg-grey-150 p-4' src={icon.href} />;
    }

    return (
        <div className='align-center flex justify-between border-y-grey-250'>
            <div className='flex'>
                {iconComponent}
                <div className='flex flex-col'>
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
