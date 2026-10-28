import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],base:'/soccer-pocket-gm/',test:{environment:'jsdom',maxWorkers:2}});
