package docscontract

import (
	"os"
	"strings"
	"testing"
)

func TestAIRuntimeSchemaPlanContract(t *testing.T) {
	content, err := os.ReadFile("../../../../docs/architecture/AI_RUNTIME_SCHEMA_PLAN.md")
	if err != nil {
		t.Fatal(err)
	}
	plan := string(content)
	for _, required := range []string{
		"ai_provider_configs",
		"ai_conversations",
		"ai_messages",
		"ai_conversation_states",
		"ai_memories",
		"ai_tool_invocations",
		"ai_generation_jobs",
		"ai_draft_questions",
		"BYO provider resolution order",
		"platform default provider",
		"plaintext API keys are forbidden",
		"encrypted_secret_ref",
		"envelope encryption",
		"Exam critical path isolation",
		"correct_answer_text",
		"expected_answer_rubric",
		"long-running generation flow",
	} {
		if !strings.Contains(plan, required) {
			t.Fatalf("AI runtime schema plan missing %q", required)
		}
	}
}
