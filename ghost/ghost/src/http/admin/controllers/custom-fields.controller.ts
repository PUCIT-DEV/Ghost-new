/**
 * Controller
 *
 * These classes are responsible for wiring HTTP Requests to the Service layer.
 * They do not contain business logic.
 */

import {Body, Controller, Get, Post, Put} from '@nestjs/common';
import {Roles} from '../../../common/decorators/permissions.decorator';
import {StaffFieldService} from '../../../core/staff-fields/staff-field.service';
import {CustomField} from '../../../core/staff-fields/custom-field.entity';
import ObjectID from 'bson-objectid';

type CustomFieldDTO = {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    created_at: Date;
    created_by: string;
}

type Response = {
    fields: CustomFieldDTO[],
    meta: any;
};

@Controller('fields/custom')
export class CustomFieldsController {
    constructor(private readonly service: StaffFieldService) {}

    toDTO(entity: CustomField) {
        const dto = {
            id: entity.id.toHexString(),
            name: entity.name,
            type: entity.type,
            enabled: entity.enabled,
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
        const fields = await this.service.getAllCustomFields();

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
        const field = await this.service.createCustomField(data.name, data.type, data.enabled);
        return {
            fields: [this.toDTO(field)],
            meta: {}
        };
    }

    @Roles([
        'Admin',
        'Owner',
        'Admin Integration'
    ])
    @Put('')
    async edit(@Body() body: unknown): Promise<Response> {
        const updatedFields: CustomField[] = [];
        if (typeof body !== 'object' || body === null) {
            throw new Error('Invalid body');
        }
        if (!('fields' in body)) {
            throw new Error('Invalid input');
        }
        if (!Array.isArray(body.fields)) {
            throw new Error('Invalid input');
        }

        for (const field of body.fields) {
            updatedFields.push(await this.service.updateCustomField(ObjectID.createFromHexString(field.id), field.name, field.enabled));
        }

        return {
            fields: updatedFields.map(this.toDTO),
            meta: {}
        };
    }
}
