import {StaffFieldRepository} from '../../core/staff-fields/staff-field.repository';
import {CustomField} from '../../core/staff-fields/custom-field.entity';
import {SocialLink} from '../../core/staff-fields/social-link.entity';

export class CustomFieldRepositoryInMemory implements StaffFieldRepository {
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

    async getAll() {
        return this.fields;
    }

    async save(entity: CustomField) {
        if (this.fields.find(existing => existing.id === entity.id)) {
            return;
        }
        this.fields.push(entity);
    }
}
