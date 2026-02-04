import { useLocalSearchParams } from "expo-router";
import { Camera } from "@/features/capture-meal";

export default function HomeScreen() {
  const { initialPhotos, targetDate } = useLocalSearchParams<{
    initialPhotos?: string;
    targetDate?: string;
  }>();

  return <Camera initialPhotos={initialPhotos} targetDate={targetDate} />;
}