import {StaffField} from './staff-field.entity';

export interface StaffFieldRepository {
    getById(staffId: string): Promise<StaffField[]>;
    save(entity: StaffField): Promise<void>;
}
