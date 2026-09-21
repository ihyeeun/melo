import { useEnterDoneEffect } from "@stackflow/react";
import { useRef, useState } from "react";

import { useGetBrandSearchQuery } from "@/features/search/brand/hooks/queries/useBrandSearchQuery";
import { useSetBrandSearchSelection } from "@/features/search/brand/stores/brandSearchSelection.store";
import styles from "@/features/search/styles/BrandSearch.module.css";
import { PATH } from "@/router/path";
import type { RegisterMenuRequestDto } from "@/shared/api/types/api.dto";
import { SearchInputHeader } from "@/shared/commons/header/SearchInputHeader";
import { SystemIcon } from "@/shared/commons/icon/SystemIcon";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { navigateBack, useLocation } from "@/shared/navigation/stackflowNavigation";

type BrandSearchResult = {
  id: string;
  name: string;
};

type BrandSearchLocationState = Partial<RegisterMenuRequestDto> & {
  returnPath?: string;
  brandSearchReturnKey?: string;
};

function mapBrandList(brandList: string[]): BrandSearchResult[] {
  return brandList.reduce<BrandSearchResult[]>((results, brandName, index) => {
    const normalizedName = brandName.trim();
    if (!normalizedName) {
      return results;
    }

    results.push({
      id: `${normalizedName}-${index}`,
      name: normalizedName,
    });

    return results;
  }, []);
}

export default function BrandSearch() {
  const location = useLocation();
  const formState = (location.state ?? {}) as BrandSearchLocationState;
  const returnPath = formState.returnPath?.trim() || PATH.NUTRIENT_ADD_REGISTER;
  const setBrandSearchSelection = useSetBrandSearchSelection();

  const [searchKeyword, setSearchKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEnterDoneEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const normalizedSubmittedKeyword = submittedKeyword.trim();
  const { data: brandSearchResult, isFetching } = useGetBrandSearchQuery(
    normalizedSubmittedKeyword,
    {
      enabled: normalizedSubmittedKeyword.length > 0,
    },
  );

  const brandResults = mapBrandList(brandSearchResult?.brand_list ?? []);
  const hasKeyword = normalizedSubmittedKeyword.length > 0;
  const hasResults = brandResults.length > 0;
  const isInitialSearching = isFetching && hasKeyword && !hasResults;

  const handleClearKeyword = () => {
    setSearchKeyword("");
    setSubmittedKeyword("");
    setSelectedBrandId("");
    searchInputRef.current?.focus();
  };

  const handleBack = () => {
    navigateBack({
      fallbackTo: returnPath,
      fallbackOptions: {
        state: formState,
      },
    });
  };

  const handleBrandSearchQuery = (value: string) => {
    const normalizedKeyword = value.trim();

    setSelectedBrandId("");
    setSubmittedKeyword(normalizedKeyword);
  };

  const handleBrandRegister = (selectedBrandName?: string) => {
    const brand = (selectedBrandName ?? searchKeyword).trim();
    if (!brand) return;

    if (formState.brandSearchReturnKey) {
      setBrandSearchSelection(formState.brandSearchReturnKey, brand);
    }

    navigateBack({
      fallbackTo: returnPath,
      fallbackOptions: {
        state: {
          ...formState,
          brand,
        },
      },
    });
  };

  const isDirectRegisterDisabled = searchKeyword.trim().length === 0;

  return (
    <section className={`${styles.page} page`}>
      <SearchInputHeader
        value={searchKeyword}
        onValueChange={setSearchKeyword}
        onClear={handleClearKeyword}
        onEnter={handleBrandSearchQuery}
        inputRef={searchInputRef}
        placeholder="브랜드명 입력"
        inputAriaLabel="브랜드명 입력"
        onBack={handleBack}
      />

      <main className={`main ${styles.searchSection}`}>
        {hasKeyword ? (
          hasResults ? (
            <ul className={styles.resultList}>
              {brandResults.map((brand) => {
                const isSelected = selectedBrandId === brand.id;

                return (
                  <li key={brand.id}>
                    <button
                      type="button"
                      className={`${styles.brandItem}`}
                      onClick={() => handleBrandRegister(brand.name)}
                      aria-pressed={isSelected}
                    >
                      <p className={`body-l-medium text-primary`}>{brand.name}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.emptyResult}>
              {isInitialSearching ? (
                <LoadingIndicator iconSize={24} label="브랜드를 검색하는 중입니다." />
              ) : (
                <>
                  <img src="/icons/characters/question.png" alt="" aria-hidden="true" width={200} />

                  <p className={`body-l-medium text-tertiary`}>
                    일치하는 브랜드가 없어요
                    <br />
                    검색하신 <span className="text-primary">{searchKeyword}</span>(으)로 브랜드명
                    등록을 진행할까요?
                  </p>

                  <button
                    type="button"
                    className={styles.addButton}
                    onClick={() => handleBrandRegister()}
                    disabled={isDirectRegisterDisabled}
                  >
                    <p className="body-m-regular textCenter">브랜드 직접 등록하기</p>
                  </button>
                </>
              )}
            </div>
          )
        ) : (
          <div className={styles.placeholderArea}>
            <img src="/icons/characters/search-mono.png" width={200} />
            <p className={`body-l-medium text-tertiary`}>찾으시는 브랜드를 검색해 주세요</p>
          </div>
        )}

        {hasKeyword && hasResults && (
          <section className={styles.brandAddSection}>
            <button
              type="button"
              className={styles.addButton}
              onClick={() => handleBrandRegister()}
              disabled={isDirectRegisterDisabled}
            >
              <SystemIcon name="plus-circle" size={18} />
              <p className="body-m-regular">브랜드 등록</p>
            </button>
          </section>
        )}
      </main>
    </section>
  );
}
