package com.inquilino.onboarding;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class StepRegistry {

    private final Map<String, OnboardingStep> stepsById;
    private final List<OnboardingStep> orderedSteps;

    public StepRegistry(List<OnboardingStep> steps) {
        this.stepsById = steps.stream()
                .collect(Collectors.toMap(OnboardingStep::getStepId, Function.identity()));
        this.orderedSteps = steps.stream()
                .sorted(Comparator.comparingInt(OnboardingStep::getStepNumber))
                .toList();
    }

    public OnboardingStep get(String stepId) {
        return Optional.ofNullable(stepsById.get(stepId))
                .orElseGet(() -> orderedSteps.get(0));
    }

    public List<OnboardingStep> getAll() {
        return Collections.unmodifiableList(orderedSteps);
    }

    public int totalSteps() {
        return orderedSteps.size();
    }

    public Optional<OnboardingStep> getPrevious(String stepId) {
        OnboardingStep current = stepsById.get(stepId);
        if (current == null) return Optional.empty();
        return orderedSteps.stream()
                .filter(s -> s.getStepNumber() == current.getStepNumber() - 1)
                .findFirst();
    }

    public Optional<OnboardingStep> getNext(String stepId) {
        OnboardingStep current = stepsById.get(stepId);
        if (current == null) return Optional.empty();
        return orderedSteps.stream()
                .filter(s -> s.getStepNumber() == current.getStepNumber() + 1)
                .findFirst();
    }
}
