import {Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseFilters, UseInterceptors} from '@nestjs/common';
import {SnippetsService} from '../../../core/snippets/snippets.service';
import {SnippetDTO} from './snippet.dto';
import {Pagination} from '../../../common/types/pagination.type';
import ObjectID from 'bson-objectid';
import {now} from '../../../common/helpers/date.helper';
import {LocationHeaderInterceptor} from '../../interceptors/location-header.interceptor';
import {GlobalExceptionFilter} from '../../filters/global-exception.filter';
import {NotFoundError} from '@tryghost/errors';
import {AJVValidationPipe} from '../../pipes/ajv-validation.pipe';

@Controller('snippets')
@UseInterceptors(LocationHeaderInterceptor)
@UseFilters(GlobalExceptionFilter)
export class SnippetsController {
    constructor(private readonly service: SnippetsService) {}

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

    @Put(':id')
    async edit(
        @Param('id') id: 'string',
        @Body(new AJVValidationPipe('snippets-update')) body: any,
        @Query('formats') formats?: 'mobiledoc' | 'lexical'
    ): Promise<{snippets: [SnippetDTO]}> {
        const snippet = await this.service.update(ObjectID.createFromHexString(id), body.snippets[0]);
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

    @Post('')
    async add(
        @Body(new AJVValidationPipe('snippets-add')) body: any,
        @Query('formats') formats?: 'mobiledoc' | 'lexical'
    ): Promise<{snippets: [SnippetDTO]}> {
        const snippet = await this.service.create({
            ...body.snippets[0],
            updatedAt: now()
        });

        return {
            snippets: [new SnippetDTO(snippet, {formats})]
        };
    }

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
