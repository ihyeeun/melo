import { useEnterDoneEffect } from "@stackflow/react";
import { useRef, useState } from "react";

import { useGetBrandSearchQuery } from "@/features/search/brand/hooks/queries/useBrandSearchQuery";
import { useSetBrandSearchSelection } from "@/features/search/brand/stores/brandSearchSelection.store";
import styles from "@/features/search/styles/BrandSearch.module.css";
import { PATH } from "@/router/path";
import type { RegisterMenuRequestDto } from "@/shared/api/types/api.dto";
import { Button } from "@/shared/commons/button/Button";
import { SearchInputHeader } from "@/shared/commons/header/SearchInputHeader";
import { LoadingIndicator } from "@/shared/commons/loading/Loading";
import { navigateBack, useLocation } from "@/shared/navigation/stackflowNavigation";
import { dismissKeyboard } from "@/shared/utils/keyboard.util";

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

// screen: DIET-02-005
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
  const typedKeyword = searchKeyword.trim();
  // 검색어와 같은 이름의 브랜드가 없으면 그 검색어로 등록하는 길을 보여 준다
  const hasSameNameBrand = brandResults.some(
    (brand) => brand.name.toLowerCase() === typedKeyword.toLowerCase(),
  );

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

      {/* 목록을 끌어 스크롤하면 키보드를 내린다 (_global 검색 화면 키보드) */}
      <main className={`main ${styles.searchSection}`} onTouchMove={dismissKeyboard}>
        {hasKeyword ? (
          hasResults ? (
            <ul className={styles.resultList}>
              {!hasSameNameBrand && typedKeyword ? (
                <li>
                  <button
                    type="button"
                    className={`${styles.registerRow} body-m-medium`}
                    onClick={() => handleBrandRegister()}
                  >
                    + ‘{typedKeyword}’로 등록하기
                  </button>
                </li>
              ) : null}
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
                    ‘{normalizedSubmittedKeyword}’ 브랜드가 아직 없어요
                  </p>
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
      </main>

      {/* 결과가 없으면 키보드 위에 큰 등록 버튼 (_global 검색 화면 키보드의 예외) */}
      {hasKeyword && !hasResults && !isInitialSearching && typedKeyword ? (
        <footer className="footer">
          <Button onClick={() => handleBrandRegister()} fullWidth size="m">
            ‘{typedKeyword}’로 등록하기
          </Button>
        </footer>
      ) : null}
    </section>
  );
}
