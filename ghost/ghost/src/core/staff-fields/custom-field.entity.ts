import {Entity} from '../../common/entity.base';
import {Actor} from '../../common/types/actor.type';

type CustomFieldData = {
    name: string;
    type: 'url' | 'short' | 'long' | 'boolean';
};

export class CustomField extends Entity<CustomFieldData> {
    get name() {
        return this.attr.name;
    }

    get type() {
        return this.attr.type;
    }

    static create(data: unknown, actor?: Actor) {
        if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid data');
        }

        let name = null;
        if (!('name' in data) || typeof data.name !== 'string' || data.name.trim().length > 50) {
            throw new Error(
                'Social link name must be a string less than 50 chars'
            );
        } else {
            name = data.name;
        }

        const allowedTypes = ['url', 'short', 'long', 'boolean'];
        let type = null;
        if (!('type' in data) || typeof data.type !== 'string' || !allowedTypes.includes(data.type)) {
            throw new Error(
                `Custom field type must be one of ${allowedTypes.join(', ')}`
            );
        } else {
            type = data.type as CustomFieldData['type'];
        }

        return new CustomField({
            name,
            type
        }, actor);
    }
}
