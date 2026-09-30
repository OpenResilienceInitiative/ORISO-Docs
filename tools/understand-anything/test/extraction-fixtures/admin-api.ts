import getCounselorById from '../counselor/getCounselorById';
import { putAgenciesForCounselor } from './putAgenciesForCounselor';

type ConsultantSelection = string | number | { value?: string | number; id?: string | number };

const normalizeSelectionId = (selection: ConsultantSelection) => {
    if (typeof selection === 'string' || typeof selection === 'number') {
        return String(selection);
    }

    if (selection?.value !== undefined && selection.value !== null) {
        return String(selection.value);
    }

    if (selection?.id !== undefined && selection.id !== null) {
        return String(selection.id);
    }

    return '';
};

const extractAgencyId = (agency: { id?: string | number | null }) => {
    return agency?.id !== undefined && agency.id !== null ? String(agency.id) : '';
};

export const assignAgencyToConsultants = async (
    agencyId: string | number,
    consultantSelections: ConsultantSelection[] = [],
) => {
    const finalAgencyId = String(agencyId);
    const consultantIds = Array.from(new Set(consultantSelections.map(normalizeSelectionId).filter(Boolean)));

    if (!finalAgencyId || consultantIds.length === 0) {
        return;
    }

    await Promise.all(
        consultantIds.map(async (consultantId) => {
            const consultant = await getCounselorById(consultantId);
            const agencyIds = new Set([
                ...(consultant.agencyIds || []).map(String),
                ...(consultant.agencies || []).map(extractAgencyId).filter(Boolean),
            ]);

            agencyIds.add(finalAgencyId);

            await putAgenciesForCounselor(consultantId, Array.from(agencyIds));
        }),
    );
};
