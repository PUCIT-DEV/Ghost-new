import {SnippetsController} from '../http/controllers/snippets.controller';
import {SnippetRepositoryBookshelf} from '../core/snippets/snippets.repository.bookshelf';
import {SnippetsService} from '../core/snippets/snippets.service';
import {KnexSnippetsRepository} from '../db/knex/snippets.repository';

class AppModuleClass {}

export const AppModule = {
    module: AppModuleClass,
    controllers: [SnippetsController],
    providers: [
        {
            provide: 'SnippetsRepository',
            useClass: KnexSnippetsRepository
        },
        SnippetsService
    ]
};
