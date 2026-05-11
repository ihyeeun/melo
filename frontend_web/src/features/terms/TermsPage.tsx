import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

import { PATH } from "@/router/path";
import { PageHeader } from "@/shared/commons/header/PageHeader";
import { navigateBack } from "@/shared/navigation/stackflowNavigation";

import styles from "./TermsPage.module.css";

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <PageHeader title="약관" onBack={() => navigateBack({ fallbackTo: PATH.HOME })} />

      <section className={styles.container}>
        <div className={styles.accordionContainer}>
          <Accordion.Root className={styles.accordion}>
            <Accordion.Item>
              <Accordion.Header className={styles.header}>
                <Accordion.Trigger className={`${styles.trigger} typo-title4`}>
                  서비스 이용약관
                  <ChevronDown size={24} className={styles.triggerIcon} />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel className={styles.panel}>
                <div className={styles.content}>
                  <a
                    className={styles.link}
                    href="https://third-princess-d57.notion.site/termsofservice"
                    rel="noreferrer"
                    target="_blank"
                  >
                    서비스 이용약관 보러가기
                  </a>
                </div>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>

          <Accordion.Root className={styles.accordion}>
            <Accordion.Item>
              <Accordion.Header className={styles.header}>
                <Accordion.Trigger className={`${styles.trigger} typo-title4`}>
                  개인정보처리방침
                  <ChevronDown size={24} className={styles.triggerIcon} />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel className={styles.panel}>
                <div className={styles.content}>
                  <a
                    className={styles.link}
                    href="https://third-princess-d57.notion.site/privacypolicy"
                    rel="noreferrer"
                    target="_blank"
                  >
                    개인정보처리방침 보러가기
                  </a>
                </div>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        </div>
      </section>
    </div>
  );
}
