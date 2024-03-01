import {Inject} from '@nestjs/common';
import {StaffFieldRepository} from './staff-field.repository';
import {CustomField} from './custom-field.entity';
import {Actor} from '../../common/types/actor.type';
import {SocialLink} from './social-link.entity';

export class StaffFieldService {
    constructor(
        @Inject('StaffFieldRepository') private repository: StaffFieldRepository
    ) {}

    async createCustomField(name: string, type: string, actor?: Actor) {
        const field = CustomField.create({name, type}, actor);

        await this.repository.save(field);

        return field;
    }

    async createSocialLink(name: string, placeholder: string | null, actor?: Actor) {
        const field = SocialLink.create({name, placeholder}, actor);

        await this.repository.save(field);

        return field;
    }

    async getAll() {
        return await this.repository.getAll();
    }

    async getAllSocialLinks(): Promise<SocialLink[]> {
        const all = await this.repository.getAll();
        return all.filter(this.isSocialLink);
    }

    async getAllCustomFields(): Promise<CustomField[]> {
        const all = await this.repository.getAll();
        return all.filter(this.isCustomField);
    }

    private isSocialLink(entity: SocialLink | CustomField): entity is SocialLink {
        return 'icon' in entity;
    }

    private isCustomField(entity: SocialLink | CustomField): entity is CustomField {
        return 'type' in entity;
    }
}
