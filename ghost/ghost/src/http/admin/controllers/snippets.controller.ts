import {Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseFilters, UseGuards, UseInterceptors} from '@nestjs/common';
import {SnippetsService} from '../../../core/snippets/snippets.service';
import {SnippetDTO} from './snippet.dto';
import {Pagination} from '../../../common/types/pagination.type';
import ObjectID from 'bson-objectid';
import {now} from '../../../common/helpers/date.helper';
import {LocationHeaderInterceptor} from '../../interceptors/location-header.interceptor';
import {GlobalExceptionFilter} from '../../filters/global-exception.filter';
import {NotFoundError} from '@tryghost/errors';
import {Roles} from '../../../common/decorators/permissions.decorator';
import {PermissionsGuard} from '../../guards/permissions.guard';
import {AdminAPIAuthentication} from '../../guards/admin-api-authentication.guard';

@Controller('snippets')
@UseGuards(AdminAPIAuthentication, PermissionsGuard)
@UseInterceptors(LocationHeaderInterceptor)
@UseFilters(GlobalExceptionFilter)
export class SnippetsController {
    constructor(private readonly service: SnippetsService) {}

    mapBodyToData(body: unknown): {name?: string, description?: string, lexical?: string, mobiledoc?: string} {
        if (typeof body !== 'object' || body === null) {
            return {};
        }
        if (!Reflect.has(body, 'snippets')) {
            return {};
        }

        const bodyWithSnippets = body as {snippets: unknown;};

        if (!Array.isArray(bodyWithSnippets.snippets)) {
            return {};
        }

        const firstSnippet = bodyWithSnippets.snippets[0] as unknown;

        if (typeof firstSnippet !== 'object' || firstSnippet === null) {
            return {};
        }

        // We use any here because we don't know what the type is, but we are checking that it's a string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const getString = (obj: object) => (prop: string) => (prop in obj && typeof (obj as any)[prop] === 'string' ? (obj as any)[prop] : undefined);

        const getStringFrom = getString(firstSnippet);

        const data = {
            name: getStringFrom('name'),
            description: getStringFrom('description'),
            lexical: getStringFrom('lexical'),
            mobiledoc: getStringFrom('mobiledoc')
        };

        return data;
    }

    @Roles([
        'Admin',
        'Author',
        'Contributor',
        'Editor',
        'Owner',
        'Admin Integration'
    ])
    @Get(':id')
    async read(
        @Param('id') id: 'string',
        @Query('formats') formats?: 'mobiledoc' | 'lexical'
    ): Promise<{snippets: [SnippetDTO]}> {
        const snippet = await this.service.getOne(ObjectID.createFromHexString(id));
        if (snippet === null) {
            throw new NotFoundError({
                context: 'Snippet not found.',
                message: 'Resource not found error, cannot read snippet.'
            });
        }
        return {
            snippets: [new SnippetDTO(snippet, {formats})]
        };
    }

    @Roles([
        'Admin',
        'Editor',
        'Owner',
        'Admin Integration'
    ])
    @Delete(':id')
    @HttpCode(204)
    async destroy(
        @Param('id') id: 'string'
    ) {
        const snippet = await this.service.delete(ObjectID.createFromHexString(id));
        if (snippet === null) {
            throw new NotFoundError({
                context: 'Resource could not be found.',
                message: 'Resource not found error, cannot delete snippet.'
            });
        }
        return {};
    }

    @Roles([
        'Admin',
        'Editor',
        'Owner',
        'Admin Integration'
    ])
    @Put(':id')
    async edit(
        @Param('id') id: 'string',
        @Body() body: unknown,
        @Query('formats') formats?: 'mobiledoc' | 'lexical'
    ): Promise<{snippets: [SnippetDTO]}> {
        const snippet = await this.service.update(ObjectID.createFromHexString(id), this.mapBodyToData(body));
        if (snippet === null) {
            throw new NotFoundError({
                context: 'Snippet not found.',
                message: 'Resource not found error, cannot read snippet.'
            });
        }
        return {
            snippets: [new SnippetDTO(snippet, {formats})]
        };
    }

    @Roles([
        'Admin',
        'Editor',
        'Owner',
        'Admin Integration'
    ])
    @Post('')
    async add(
        @Body() body: unknown,
        @Query('formats') formats?: 'mobiledoc' | 'lexical'
    ): Promise<{snippets: [SnippetDTO]}> {
        const snippet = await this.service.create({
            ...this.mapBodyToData(body),
            updatedAt: now()
        // We cast this as `any` because we're having to pass updatedAt as a hack to replicate broken existing API implementation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        return {
            snippets: [new SnippetDTO(snippet, {formats})]
        };
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
    async browse(
        @Query('formats') formats?: 'mobiledoc' | 'lexical',
        @Query('filter') filter?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number | 'all' = 15
    ): Promise<{snippets: SnippetDTO[], meta: {pagination: Pagination;};}> {
        let snippets;
        let total;
        if (limit === 'all') {
            snippets = await this.service.getAll({
                filter
            });
            total = snippets.length;
        } else {
            const result = await this.service.getPage({
                filter,
                page,
                limit
            });
            total = result.count;
            snippets = result.data;
        }
        const pages = limit === 'all' ? 0 : Math.ceil(total / limit);

        const snippetDTOs = snippets.map(snippet => new SnippetDTO(snippet, {formats}));

        return {
            snippets: snippetDTOs,
            meta: {
                pagination: {
                    page,
                    limit,
                    total,
                    pages,
                    prev: page > 1 ? page - 1 : null,
                    next: page < pages ? page + 1 : null
                }
            }
        };
    }
}
