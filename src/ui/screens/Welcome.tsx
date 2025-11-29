import React, { useEffect } from 'react';
import { Text, Box, useInput } from 'ink';
import { IConfigRepository } from '../../domain/interfaces.js';
import { VALIV_MEMBERS } from '../../domain/constants.js';

interface WelcomeScreenProps {
    configRepo: IConfigRepository;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ configRepo }) => {
    useEffect(() => {
        configRepo.saveCreators(VALIV_MEMBERS);
    }, [configRepo]);

    useInput((input, key) => {
        if (key.return) {
            // In a real app, we might navigate or do something here.
            // For now, just exit or show a message.
            process.exit(0);
        }
    });

    return (
        <Box flexDirection="column" padding={1} borderStyle="round" borderColor="cyan">
            <Text bold color="cyan">
                Welcome to valiv-cli!
            </Text>
            <Text>
                Your personal vα-liv activity tracker.
            </Text>
            <Box marginTop={1}>
                <Text>
                    Initial members have been registered.
                </Text>
            </Box>
            <Box marginTop={1}>
                <Text>
                    Run <Text color="green">valiv add</Text> to add your favorite creators.
                </Text>
            </Box>
            <Box marginTop={1}>
                <Text dimColor>Press Enter to exit</Text>
            </Box>
        </Box>
    );
};

export default WelcomeScreen;
