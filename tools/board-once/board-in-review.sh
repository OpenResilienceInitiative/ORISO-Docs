#!/usr/bin/env bash
# Put every issue that now carries an open pull request on the ORISO Roadmap
# (org project 1) and set its Status to "In review".
#
# Safe by default: DRY_RUN=1 only prints what it would do.
#   gh auth refresh -s project          # once, gives your gh login the project scope
#   bash board-in-review.sh             # dry run, prints the plan
#   DRY_RUN=0 bash board-in-review.sh   # apply
#
# Like .github/scripts/qa_internal_mover.py it only moves from
# (none) / Backlog / Ready / In progress. On hold, QA and Done stay untouched.
# Closed issues are skipped. Epics are listed separately and skipped unless
# INCLUDE_EPICS=1.
set -euo pipefail

ORG=OpenResilienceInitiative
PROJECT=1
TARGET="In review"
DRY_RUN=${DRY_RUN:-1}
INCLUDE_EPICS=${INCLUDE_EPICS:-0}

# repo issue  # open PR(s) that name it
ISSUES=(
  "ORISO-Frontend 1163"      # Frontend#1276
  "ORISO-Frontend 594"       # Frontend#1422
  "ORISO-Frontend 458"       # Frontend#1423
  "ORISO-Frontend 1326"      # Frontend#1424
  "ORISO-Frontend 1522"      # Frontend#1580
  "ORISO-Frontend 1726"      # Frontend#1727
  "ORISO-Frontend 1728"      # Frontend#1729
  "ORISO-Frontend 1730"      # Frontend#1731
  "ORISO-Frontend 1754"      # Frontend#1756
  "ORISO-Frontend 1755"      # Frontend#1757
  "ORISO-Frontend 1799"      # UserService#1437
  "ORISO-Frontend 1849"      # Helm#445
  "ORISO-Admin 711"          # Admin#878
  "ORISO-Admin 1270"         # Admin#1271
  "ORISO-UserService 1022"   # UserService#1023
  "ORISO-UserService 1024"   # UserService#1025
  "ORISO-UserService 1052"   # UserService#1139
  "ORISO-UserService 1422"   # UserService#1424
  "ORISO-UserService 1428"   # UserService#1429
  "ORISO-UserService 1466"   # UserService#1468, Admin#1240
  "ORISO-UserService 1532"   # UserService#1128 (new)
  "ORISO-AgencyService 217"  # AgencyService#291
  "ORISO-TenantService 208"  # TenantService#215
  "ORISO-Docs 170"           # Frontend#1671, Admin#1162
  "ORISO-Docs 195"           # TenantService#176, ConsultingTypeService#122
  "ORISO-Helm 436"           # E2E#88
  "ORISO-Helm 461"           # 11 release PRs v2.0.14 (new)
  "ORISO-E2E 25"             # E2E#78
)
EPICS=(
  "ORISO-Frontend 512"       # Frontend#1868
  "ORISO-Docs 194"           # TenantService#177, ConsultingTypeService#123, #127
  "ORISO-Helm 282"           # Helm#426
)
[ "$INCLUDE_EPICS" = 1 ] && ISSUES+=("${EPICS[@]}")

proj=$(gh api graphql -f query='
query($o:String!,$n:Int!){organization(login:$o){projectV2(number:$n){
  id field(name:"Status"){... on ProjectV2SingleSelectField{id options{id name}}}}}}' \
  -f o="$ORG" -F n="$PROJECT")
PID=$(jq -r '.data.organization.projectV2.id' <<<"$proj")
FID=$(jq -r '.data.organization.projectV2.field.id' <<<"$proj")
OID=$(jq -r --arg t "$TARGET" '.data.organization.projectV2.field.options[] | select(.name==$t) | .id' <<<"$proj")
[ -n "$OID" ] || { echo "Status option '$TARGET' not found on project $PROJECT" >&2; exit 1; }

for entry in "${ISSUES[@]}"; do
  read -r repo num <<<"$entry"
  res=$(gh api graphql -f query='
query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){issue(number:$n){
  id state projectItems(first:20){nodes{id project{number}
    fieldValueByName(name:"Status"){... on ProjectV2ItemFieldSingleSelectValue{name}}}}}}}' \
    -f o="$ORG" -f r="$repo" -F n="$num")
  iid=$(jq -r '.data.repository.issue.id' <<<"$res")
  state=$(jq -r '.data.repository.issue.state' <<<"$res")
  item=$(jq -r --argjson p "$PROJECT" '[.data.repository.issue.projectItems.nodes[] | select(.project.number==$p)][0].id // empty' <<<"$res")
  status=$(jq -r --argjson p "$PROJECT" '[.data.repository.issue.projectItems.nodes[] | select(.project.number==$p)][0].fieldValueByName.name // empty' <<<"$res")
  label="$repo#$num"

  if [ "$state" != "OPEN" ]; then echo "skip  $label (issue is $state)"; continue; fi
  case "$status" in
    ""|"Backlog"|"Ready"|"In progress") ;;
    "$TARGET") echo "ok    $label (already $TARGET)"; continue ;;
    *) echo "skip  $label (status '$status' is left alone)"; continue ;;
  esac

  if [ "$DRY_RUN" = 1 ]; then
    echo "plan  $label: ${item:+on board, }'${status:-none}' -> '$TARGET'${item:- (add to board first)}"
    continue
  fi
  if [ -z "$item" ]; then
    item=$(gh api graphql -f query='
mutation($p:ID!,$c:ID!){addProjectV2ItemById(input:{projectId:$p,contentId:$c}){item{id}}}' \
      -f p="$PID" -f c="$iid" --jq '.data.addProjectV2ItemById.item.id')
  fi
  gh api graphql -f query='
mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){updateProjectV2ItemFieldValue(input:{
  projectId:$p,itemId:$i,fieldId:$f,value:{singleSelectOptionId:$o}}){projectV2Item{id}}}' \
    -f p="$PID" -f i="$item" -f f="$FID" -f o="$OID" >/dev/null
  echo "done  $label: '${status:-none}' -> '$TARGET'"
done
