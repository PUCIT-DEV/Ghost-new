import React from 'react';
import {Icon, Toggle} from '@tryghost/admin-x-design-system';
import {withErrorBoundary} from '@tryghost/admin-x-design-system';

const getFriendlyTypeName = (type: 'url' | 'short' | 'long' | 'boolean') => {
    switch (type) {
    case 'long':
        return 'Long Text';
        break;
    case 'short':
        return 'Short Text';
        break;
    case 'url':
        return 'Link';
        break;
    case 'boolean':
        return 'Checkbox';
        break;
    default:
        break;
    }
};

const getIconComponent = (type: 'url' | 'short' | 'long' | 'boolean', icon?: URL|null) => {
    if (!icon || !icon?.href) {
        switch (type) {
        case 'long':
            return <Icon colorClass='text-black' name='long-text' size='sm' />;
            break;
        case 'short':
            return <Icon colorClass='text-black' name='long-text' size='sm' />;
            break;
        case 'url':
            return <Icon colorClass='text-black' name='hyperlink-circle' size='sm' />;
            break;
        case 'boolean':
            return <Icon colorClass='text-black' name='long-text' size='sm' />;
            break;
        default:
            break;
        }
    } else {
        return <img src={icon.href} />;
    }
};

const CustomFieldToggle: React.FC<{
    icon?: URL | null,
    name: string,
    type: 'url' | 'short' | 'long' | 'boolean',
    placeholder?: string | null,
    enabled: boolean,
    toggleDisabled?: boolean
}> = ({
    icon,
    name,
    type,
    enabled,
    toggleDisabled = false
}) => {
    let iconComponent = getIconComponent(type, icon);
    let typeNameFriendly = getFriendlyTypeName(type);

    return (
        <div className='flex items-center justify-between border border-x-transparent border-y-grey-250 py-2'>
            <div className='flex'>
                <div className='mr-2 flex h-11 w-11 items-center justify-center rounded bg-grey-150'>
                    {iconComponent}
                </div>
                <div className='flex flex-col'>
                    <strong>{name}</strong>
                    <p>{typeNameFriendly}</p>
                </div>
            </div>
            <div>
                <Toggle checked={enabled} disabled={toggleDisabled} />
            </div>
        </div>
    );
};

export default withErrorBoundary(CustomFieldToggle, 'Custom Field Toggle');
