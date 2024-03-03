import ObjectID from 'bson-objectid';
import {CustomField} from './custom-field.entity';
import {SocialLink} from './social-link.entity';

export interface FieldRepository {
    getAll(): Promise<(CustomField | SocialLink)[]>;
    getById(id: ObjectID): Promise<CustomField | SocialLink | null>;
    save(entity: CustomField | SocialLink): Promise<void>;
}
