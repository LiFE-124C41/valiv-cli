import React, { useState, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import { ConfigRepository } from '../infrastructure/config-repository.js';
import { Creator } from '../domain/models.js';

const repository = new ConfigRepository();

const RemoveCreator: React.FC = () => {
    const { exit } = useApp();
    const [creators, setCreators] = useState<Creator[]>([]);
    const [status, setStatus] = useState<string>('');

    useEffect(() => {
        setCreators(repository.getCreators());
    }, []);

    const handleSelect = (item: { label: string; value: string }) => {
        repository.removeCreator(item.value);
        setStatus(`Removed ${item.label}`);
        setTimeout(() => {
            exit();
        }, 1000);
    };

    if (creators.length === 0) {
        return (
            <Box>
                <Text>No creators registered.</Text>
            </Box>
        );
    }

    if (status) {
        return (
            <Box>
                <Text color="green">{status}</Text>
            </Box>
        );
    }

    const items = creators.map((creator) => ({
        label: creator.name,
        value: creator.id,
    }));

    return (
        <Box flexDirection="column">
            <Text>Select a creator to remove:</Text>
            <SelectInput items={items} onSelect={handleSelect} />
        </Box>
    );
};

export default RemoveCreator;
