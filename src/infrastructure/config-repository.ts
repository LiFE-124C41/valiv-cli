import Conf from 'conf';
import { Creator } from '../domain/models.js';
import { IConfigRepository } from '../domain/interfaces.js';

interface ConfigSchema {
    creators: Creator[];
}

export class ConfigRepository implements IConfigRepository {
    private store: Conf<ConfigSchema>;

    constructor() {
        this.store = new Conf<ConfigSchema>({
            projectName: 'valiv-cli',
            defaults: {
                creators: [],
            },
        });
    }

    getCreators(): Creator[] {
        return this.store.get('creators');
    }

    saveCreator(creator: Creator): void {
        const creators = this.getCreators();
        const index = creators.findIndex((c) => c.id === creator.id);

        if (index >= 0) {
            creators[index] = creator;
        } else {
            creators.push(creator);
        }

        this.store.set('creators', creators);
    }

    saveCreators(newCreators: Creator[]): void {
        const creators = this.getCreators();

        for (const creator of newCreators) {
            const index = creators.findIndex((c) => c.id === creator.id);
            if (index >= 0) {
                creators[index] = creator;
            } else {
                creators.push(creator);
            }
        }

        this.store.set('creators', creators);
    }

    removeCreator(id: string): void {
        const creators = this.getCreators();
        const newCreators = creators.filter((c) => c.id !== id);
        this.store.set('creators', newCreators);
    }
}
