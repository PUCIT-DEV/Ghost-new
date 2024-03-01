import {CustomField} from './custom-field.entity';
import {SocialLink} from './social-link.entity';

export interface StaffFieldRepository {
    getAll(): Promise<(CustomField | SocialLink)[]>;
    save(entity: CustomField | SocialLink): Promise<void>;
}
