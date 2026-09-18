version: 1.0
platform: responsive_web
tech_stack: [Next.js, TypeScript, Tailwind, Vitest, RTL]
design_tokens:
  colors: {primary: '#0F766E', primary_hover: '#115E59', accent: '#F59E0B', surface: '#FFFBF5', text: '#202A2A', muted: '#667373', success: '#15803D', error: '#C2413B', border: '#D7E2DF'}
  breakpoints: {sm: 640px, md: 768px, lg: 1024px, xl: 1280px}
  spacing: {base: 8px, scale: [4,8,12,16,24,32,48,64]}
  typography: {heading: 'Fraunces', body: 'DM Sans', base: 16px, weights: [400,500,600,700]}
  elevation: {form: '0 8px 24px rgba(32,42,42,.08)', card: '0 4px 14px rgba(32,42,42,.08)', focus: '0 0 0 3px #99F6E4'}
  touch_targets: {desktop_min: 32px, touch_min: 44px, comfortable: 48px, spacing: 8px}
  icons: {set: Lucide, style: outlined}
responsive_behavior:
  layout: {navigation: none, grid: {xl: 12, lg: 12, md: 8, sm: 4}, content: {xl: centered_1120px, sm: full_bleed_16px_gutter}}
  components: {forms: {lg: two_column, sm: single_column}, results: {lg: three_column, md: two_column, sm: stack}, loading: skeleton_three_cards}
ux_logic:
  validation: on_submit
  error_display: inline
  success_feedback: three_recommendation_cards
  loading_states: hybrid_progress_and_skeletons
  navigation: focused_single_page
  data_density: medium
component_map:
  forms: [GiftForm, FormField, RelationshipSelect, BudgetField]
  results: [GiftResults, RecommendationCard]
  shared: [Button, Input, Select, TextArea, Card, InlineError, LoadingState, EmptyState]
user_journey:
  primary_path: age_budget_relationship_interests_to_exactly_three_suggestions
  critical_flows: [invalid_input, provider_failure_retry, responsive_results]
a11y:
  level: WCAG_AA
  focus_states: true
  keyboard_nav: true
  aria_labels: required_for_icons
  color_contrast: {text: '4.5:1', components: '3:1'}
  semantics: headings_labels_live_status
patterns:
  error_display: inline_field_and_form_state
  success_feedback: replace_loading_with_three_cards
  retry: preserve_inputs_and_resubmit
  search_filter: not_applicable
