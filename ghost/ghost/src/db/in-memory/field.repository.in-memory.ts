import {CustomField} from '../../core/staff-fields/custom-field.entity';
import {SocialLink} from '../../core/staff-fields/social-link.entity';
import {FieldRepository} from '../../core/staff-fields/field.repository';
import ObjectID from 'bson-objectid';

export class CustomFieldRepositoryInMemory implements FieldRepository {
    private fields: (CustomField | SocialLink)[];
    constructor() {
        this.fields = [
            CustomField.create({
                name: 'Awesome',
                type: 'boolean'
            }),
            SocialLink.create({
                name: 'Twitter',
                placeholder: 'https://twitter.com/name',
                icon: 'https://icon.com'
            })
        ];
    }

    async getById(id: ObjectID): Promise<CustomField | SocialLink | null> {
        return this.fields.find(field => field.id.equals(id)) || null;
    }

    async getAll() {
        return this.fields;
    }

    async save(entity: CustomField) {
        if (this.fields.find(existing => existing.id.equals(entity.id))) {
            return;
        }
        this.fields.push(entity);
    }
}
