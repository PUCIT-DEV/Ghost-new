/**
 * Controller
 *
 * These classes are responsible for wiring HTTP Requests to the Service layer.
 * They do not contain business logic.
 */

import {Body, Controller, Get, Post} from '@nestjs/common';
import {Roles} from '../../../common/decorators/permissions.decorator';
import {StaffFieldService} from '../../../core/staff-fields/staff-field.service';
import {SocialLink} from '../../../core/staff-fields/social-link.entity';

type CustomFieldDTO = {
    id: string;
    name: string;
    icon: string;
    placeholder: string | null;
    created_at: Date;
    created_by: string;
}

type Response = {
    fields: CustomFieldDTO[],
    meta: any;
};

@Controller('fields/social')
export class SocialLinksController {
    constructor(private readonly service: StaffFieldService) {}

    toDTO(entity: SocialLink): CustomFieldDTO {
        const dto = {
            id: entity.id.toHexString(),
            name: entity.name,
            icon: entity.icon.href,
            placeholder: entity.placeholder,
            created_at: entity.createdAt,
            created_by: entity.createdBy.id.toHexString()
        };
        return dto;
    }

    @Roles([
        'Admin',
        'Author',
        'Contributor',
        'Editor',
        'Owner',
        'Admin Integration'
    ])
    @Get('')
    async browse(): Promise<Response> {
        const fields = await this.service.getAllSocialLinks();

        return {
            fields: fields.map(this.toDTO),
            meta: {}
        };
    }

    @Roles([
        'Admin',
        'Owner',
        'Admin Integration'
    ])
    @Post('')
    async create(@Body() body: unknown): Promise<Response> {
        if (typeof body !== 'object' || body === null) {
            throw new Error('Invalid body');
        }
        if (!('fields' in body)) {
            throw new Error('Invalid input');
        }
        if (!Array.isArray(body.fields)) {
            throw new Error('Invalid input');
        }
        const data = body.fields[0];
        const field = await this.service.createSocialLink(data.name, data.placeholder);
        return {
            fields: [this.toDTO(field)],
            meta: {}
        };
    }
}
