import {Entity} from '../../common/entity.base';
import {Actor} from '../../common/types/actor.type';

type CustomFieldData = {
    name: string;
    icon: URL | null;
    type: 'url' | 'short' | 'long' | 'boolean';
};

export class CustomField extends Entity<CustomFieldData> {
    get name() {
        return this.attr.name;
    }

    get icon() {
        return this.attr.icon;
    }

    get type() {
        return this.attr.type;
    }

    static create(data: unknown, actor?: Actor) {
        if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid data');
        }

        if (!('name' in data) || typeof data.name !== 'string' || data.name.trim().length > 50) {
            throw new Error('Custom field name must be a string less than 50 chars');
        }

        if (!('icon' in data) || (!(data.icon instanceof URL) && data.icon !== null)) {
            throw new Error('Custom field icon must be a URL or null');
        }

        const allowedTypes = ['url', 'short', 'long', 'boolean'];
        if (!('type' in data) || typeof data.type !== 'string' || !allowedTypes.includes(data.type)) {
            throw new Error(`Custom field type must be one of ${allowedTypes.join(', ')}`);
        }

        const type = data.type;

        return new CustomField({
            name: data.name,
            icon: data.icon as CustomFieldData['icon'],
            type: type as CustomFieldData['type']
        }, actor);
    }
}
