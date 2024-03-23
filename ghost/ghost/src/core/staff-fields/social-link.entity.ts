import {Entity} from '../../common/entity.base';
import {Actor} from '../../common/types/actor.type';

type SocialLinkData = {
    name: string;
    enabled: boolean;
    icon: URL;
    placeholder: string | null;
};

export class SocialLink extends Entity<SocialLinkData> {
    get name() {
        return this.attr.name;
    }

    get icon() {
        return this.attr.icon;
    }

    get placeholder() {
        return this.attr.placeholder;
    }

    get enabled() {
        return this.attr.enabled;
    }

    set name(value: string) {
        this.set('name', value);
    }

    set placeholder(value: string|null) {
        this.set('placeholder', value);
    }

    set enabled(value: boolean) {
        this.set('enabled', value);
    }

    set icon(value: URL) {
        this.set('icon', value);
    }

    validate(value: unknown) {
        if (value === null) {
            return value;
        }
        if (typeof value === 'string') {
            return new URL(value);
        }
        if (value instanceof URL) {
            return value;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error('Validation failed for SocialLink value', value as any);
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

        let placeholder = null;

        if (!('placeholder' in data) || data.name === null) {
            placeholder = null;
        } else if (typeof data.placeholder !== 'string' || data.name.trim().length > 200) {
            throw new Error(
                'Social link placeholder must be a string less than 200 chars'
            );
        } else {
            placeholder = data.placeholder;
        }

        let icon = null;

        if (!('icon' in data)) {
            throw new Error('Custom field icon must be a URL');
        } else if (typeof data.icon === 'string') {
            icon = new URL(data.icon);
        } else if (!(data.icon instanceof URL)) {
            throw new Error('Social link icon must be a URL');
        } else {
            icon = data.icon;
        }

        return new SocialLink({
            name,
            icon,
            placeholder,
            enabled: false
        }, actor);
    }
}
