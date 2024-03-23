import {Entity} from '../../common/entity.base';
import {Actor} from '../../common/types/actor.type';

type SiteSocialLinkData = {
    name: string;
    icon: URL;
    value: URL;
};

export class SiteSocialLink extends Entity<SiteSocialLinkData> {
    get name() {
        return this.attr.name;
    }

    get icon() {
        return this.attr.icon;
    }

    get value(): URL {
        return this.attr.value;
    }

    set value(value: unknown) {
        this.set('value', this.validate(value));
    }

    validate(value: unknown) {
        if (typeof value === 'string') {
            return new URL(value);
        }
        if (value instanceof URL) {
            return value;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error('Validation failed for SiteSocialLink value', value as any);
    }

    static create(data: unknown, actor?: Actor) {
        if (typeof data !== 'object' || data === null) {
            throw new Error('Invalid data');
        }

        let name = null;
        if (!('name' in data) || typeof data.name !== 'string' || data.name.trim().length > 50) {
            throw new Error(
                'Site social link name must be a string less than 50 chars'
            );
        } else {
            name = data.name;
        }

        let icon = null;

        if (!('icon' in data)) {
            throw new Error('Site social link icon must be a URL');
        } else if (typeof data.icon === 'string') {
            icon = new URL(data.icon);
        } else if (!(data.icon instanceof URL)) {
            throw new Error('Site social link icon must be a URL');
        } else {
            icon = data.icon;
        }

        let value = null;

        if (!('value' in data)) {
            throw new Error('Site social link value must be a URL');
        } else if (typeof data.value === 'string') {
            value = new URL(data.value);
        } else if (!(data.value instanceof URL)) {
            throw new Error('Site social link value must be a URL');
        } else {
            value = data.value;
        }

        return new SiteSocialLink({
            name,
            icon,
            value
        }, actor);
    }
}
