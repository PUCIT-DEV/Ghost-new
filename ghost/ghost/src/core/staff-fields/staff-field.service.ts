import {Inject} from '@nestjs/common';
import {StaffFieldRepository} from './staff-field.repository';
import {FieldRepository} from './field.repository';
import {CustomField} from './custom-field.entity';
import {Actor} from '../../common/types/actor.type';
import {SocialLink} from './social-link.entity';
import {StaffField} from './staff-field.entity';
import ObjectID from 'bson-objectid';

export class StaffFieldService {
    constructor(
        @Inject('FieldRepository') private repository: FieldRepository,
        @Inject('StaffFieldRepository') private staffFieldRepository: StaffFieldRepository
    ) {}

    async createCustomField(name: string, type: string, actor?: Actor) {
        const field = CustomField.create({name, type}, actor);

        await this.repository.save(field);

        return field;
    }

    async updateCustomField(id: ObjectID, name: string, enabled: boolean) {
        const field = await this.repository.getById(id);

        if (!field) {
            throw new Error('not exists');
        }

        if (field instanceof SocialLink) {
            throw new Error('not a custom field');
        }

        field.name = name;
        field.enabled = enabled;

        await this.repository.save(field);

        return field;
    }

    async updateSocialLink(id: ObjectID, name: string, enabled: boolean, placeholder: string|null, icon: URL) {
        const field = await this.repository.getById(id);

        if (!field) {
            throw new Error('not exists');
        }

        if (field instanceof CustomField) {
            throw new Error('not a social link');
        }

        field.name = name;
        field.enabled = enabled;
        field.placeholder = placeholder;
        field.icon = icon;

        await this.repository.save(field);

        return field;
    }

    async createSocialLink(name: string, placeholder: string | null, icon: string | URL, actor?: Actor) {
        const field = SocialLink.create({name, placeholder, icon}, actor);

        await this.repository.save(field);

        return field;
    }

    async getStaffFields(staffId: string): Promise<StaffField[]> {
        const fields = await this.staffFieldRepository.getById(staffId);
        return fields;
    }

    async createStaffField(staffId: string, fieldId: ObjectID, value: any): Promise<StaffField> {
        const field = await this.repository.getById(fieldId);

        const staffField = StaffField.create({
            staffId,
            field,
            value
        });

        await this.staffFieldRepository.save(staffField);

        return staffField;
    }

    async updateStaffField(staffField: StaffField, value: any): Promise<StaffField> {
        staffField.value = value;
        await this.staffFieldRepository.save(staffField);
        return staffField;
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
