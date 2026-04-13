'use client'

import { GuideProvider } from './GuideProvider'
import WelcomeScreen from './onboarding/WelcomeScreen'
import CharacterDialogue from './onboarding/CharacterDialogue'
import VirtualTaskManager from './onboarding/VirtualTaskManager'
import { CompleteTaskButton } from './onboarding/TaskDetector'
import { useGuide } from './GuideProvider'

function OnboardingContent({ children }: { children: React.ReactNode }) {
  const { showWelcome } = useGuide()

  return (
    <>
      {children}
      {showWelcome && <WelcomeScreen />}
      <CharacterDialogue />
      <VirtualTaskManager />
      <CompleteTaskButton />
    </>
  )
}

export default function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  return (
    <GuideProvider>
      <OnboardingContent>
        {children}
      </OnboardingContent>
    </GuideProvider>
  )
}
