import {StaffFieldRepository} from '../../core/staff-fields/staff-field.repository';
import {StaffField} from '../../core/staff-fields/staff-field.entity';

export class StaffFieldRepositoryInMemory implements StaffFieldRepository {
    private fields: (StaffField)[];
    constructor() {
        this.fields = [];
    }

    async getById(id: string): Promise<StaffField[]> {
        return this.fields.filter(field => field.staffId === id) || [];
    }

    async save(entity: StaffField) {
        if (this.fields.find(existing => existing.id.equals(entity.id))) {
            this.fields = this.fields.map((field) => {
                if (field.id.equals(entity.id)) {
                    return entity;
                }
                return field;
            });
        }
        this.fields.push(entity);
    }
}
