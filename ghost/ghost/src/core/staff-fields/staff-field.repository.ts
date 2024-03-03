import ObjectID from 'bson-objectid';
import {StaffField} from './staff-field.entity';

export interface StaffFieldRepository {
    getById(staffId: ObjectID): Promise<StaffField[]>;
    save(entity: StaffField): Promise<void>;
}
