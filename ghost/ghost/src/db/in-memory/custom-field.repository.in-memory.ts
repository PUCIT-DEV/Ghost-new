import {CustomFieldRepository} from '../../core/staff-fields/custom-field.repository';
import {CustomField} from '../../core/staff-fields/custom-field.entity';

export class CustomFieldRepositoryInMemory implements CustomFieldRepository {
    private fields: CustomField[];
    constructor() {
        this.fields = [
            CustomField.create({
                name: 'Awesome',
                icon: null,
                type: 'boolean'
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
