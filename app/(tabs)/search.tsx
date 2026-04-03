import StudioPublishScreen from '@/components/studio/StudioPublishScreen';
import { useUserStore } from '@/store/useUserStore';
import ExploreScreen from './explore';

export default function SearchScreen() {
    const activeAppMode = useUserStore((state) => state.activeAppMode);

    if (activeAppMode === 'studio') {
        return <StudioPublishScreen />;
    }

    return <ExploreScreen />;
}
