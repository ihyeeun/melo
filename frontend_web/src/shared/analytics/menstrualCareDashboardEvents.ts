import { track } from "@/shared/analytics/analytics";
import { EVENT_NAME } from "@/shared/analytics/analytics.constants";

export function trackMenstrualCareDashboardTeaserClick() {
  track(EVENT_NAME.MENSTRUAL_CARE_CLICK);
}

export function trackMenstrualCareDashboardTeaserStartDateSubmit(menstrualStartDate: string) {
  track(EVENT_NAME.MENSTRUAL_CARE_START_DATE_SUBMIT, {
    menstrual_start_date: menstrualStartDate,
  });
}
