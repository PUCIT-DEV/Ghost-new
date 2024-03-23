import ObjectID from 'bson-objectid';
import {SiteSocialLink} from './site-social-link.entity';

export interface SiteSocialLinkRepository {
    getAll(): Promise<SiteSocialLink[]>;
    getById(id: ObjectID): Promise<SiteSocialLink | null>;
    save(entity: SiteSocialLink): Promise<void>;
}
