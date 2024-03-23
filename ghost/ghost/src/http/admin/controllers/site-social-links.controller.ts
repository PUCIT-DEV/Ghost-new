/**
 * Controller
 *
 * These classes are responsible for wiring HTTP Requests to the Service layer.
 * They do not contain business logic.
 */

import {Body, Controller, Get, Post} from '@nestjs/common';
import {Roles} from '../../../common/decorators/permissions.decorator';
import {SiteSocialLink} from '../../../core/site-social-links/site-social-link.entity';
import {SiteSocialLinksService} from '../../../core/site-social-links/site-social-links.service';

type CustomFieldDTO = {
    id: string;
    name: string;
    icon: string;
    value: string;
    created_at: Date;
    created_by: string;
};

type Response = {
    fields: CustomFieldDTO[];
    meta: any;
};

@Controller('site/fields/social')
export class SiteSocialLinksController {
    constructor(private readonly service: SiteSocialLinksService) {}

    toDTO(entity: SiteSocialLink): CustomFieldDTO {
        const dto = {
            id: entity.id.toHexString(),
            name: entity.name,
            icon: entity.icon.href,
            value: entity.value.href,
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
        const fields = await this.service.getAll();

        return {
            fields: fields.map(this.toDTO),
            meta: {}
        };
    }

    @Roles(['Admin', 'Owner', 'Admin Integration'])
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
        const field = await this.service.createSiteSocialLink(
            data.name,
            data.value,
            data.icon
        );
        return {
            fields: [this.toDTO(field)],
            meta: {}
        };
    }
}
