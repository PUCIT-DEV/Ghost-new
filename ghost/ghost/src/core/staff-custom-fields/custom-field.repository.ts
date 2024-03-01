import {CustomField} from './custom-field.entity';

export interface CustomFieldRepository {
    getAll(): Promise<CustomField[]>;
    save(entity: CustomField): Promise<void>;
}
