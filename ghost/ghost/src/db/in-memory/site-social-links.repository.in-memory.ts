import ObjectID from 'bson-objectid';
import {SiteSocialLinkRepository} from '../../core/site-social-links/site-social-links.repository';
import {SiteSocialLink} from '../../core/site-social-links/site-social-link.entity';

export class SiteSocialLinkRepositoryInMemory implements SiteSocialLinkRepository {
    private fields: SiteSocialLink[];
    constructor() {
        this.fields = [
            SiteSocialLink.create({
                name: 'Twitter',
                value: 'https://twitter.com/name',
                icon: 'https://icon.com'
            })
        ];
    }

    async getById(id: ObjectID): Promise<SiteSocialLink | null> {
        return this.fields.find(field => field.id.equals(id)) || null;
    }

    async getAll() {
        return this.fields;
    }

    async save(entity: SiteSocialLink) {
        if (this.fields.find(existing => existing.id.equals(entity.id))) {
            return;
        }
        this.fields.push(entity);
    }
}
