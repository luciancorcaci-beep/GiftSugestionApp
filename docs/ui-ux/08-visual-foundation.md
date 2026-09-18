version: 1.0
platform: responsive_web
layout:
  shell: centered_single_flow
  max_width: 1120px
  navigation: none
  entry: form_first
  results: three_card_grid
  grid:
    xl: 12_columns
    lg: 12_columns
    md: 8_columns
    sm: 4_columns
  content:
    xl: max_width_centered
    sm: full_bleed_with_16px_gutter
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
component_hierarchy:
  atoms:
    - Button
    - Input
    - Select
    - TextArea
    - Label
    - Icon
    - Spinner
  molecules:
    - FormField
    - RelationshipSelect
    - BudgetField
    - LoadingCard
    - InlineError
  organisms:
    - GiftForm
    - GiftResults
    - RecommendationCard
    - GenerationStatus
  pages:
    - GiftRecommendationPage
responsive_rules:
  form:
    lg: two_column_fields_with_full_width_interests
    sm: single_column
  results:
    lg: three_equal_columns
    md: two_columns_then_one
    sm: single_column
  errors: inline_below_control
  loading: progress_message_plus_three_skeleton_cards
  purchase_links: full_width_action_within_card
spacing:
  base: 8px
  scale: [4, 8, 12, 16, 24, 32, 48, 64]
touch_targets:
  desktop_min: 32px
  touch_min: 44px
  comfortable: 48px
  spacing: 8px
elevation:
  page: none
  form: 1
  recommendation_card: 2
  focus: 0 0 0 3px
