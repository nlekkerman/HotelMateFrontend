import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { LIST_VARIANTS } from '@/types/presets';
import CardRenderer from './CardRenderer';

/**
 * ListSectionPreset - Renders list/cards section based on layout_preset.key
 * 
 * Supported variants:
 * - list_grid_3col (default)
 * - list_grid_2col
 * - list_grid_4col
 * - list_horizontal_scroll
 * - list_vertical_list
 * - list_featured_grid
 */
const ListSectionPreset = ({ section, onUpdate }) => {
  const variantKey = section.layout_preset?.key ?? LIST_VARIANTS.GRID_3COL;
  const lists = section.lists || [];

  if (lists.length === 0) {
    return null;
  }

  const hasCards = lists.some(l => l.cards && l.cards.length > 0);

  if (!hasCards) {
    return null;
  }

  // 2 Column Grid
  if (variantKey === LIST_VARIANTS.GRID_2COL) {
    return (
      <section className={`list-section list-section--grid-2col ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container>
          <h2 className="list-section__title text-center mb-5">{section.name}</h2>
          {lists.map((list) => (
            <div key={list.id} className="list-section__container mb-5">
              {list.title && <h3 className="list-section__subtitle mb-4">{list.title}</h3>}
              <Row className="g-4">
                {list.cards?.map((card) => (
                  <Col key={card.id} xs={12} md={6}>
                    <CardRenderer card={card} />
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </Container>
      </section>
    );
  }

  // 4 Column Grid
  if (variantKey === LIST_VARIANTS.GRID_4COL) {
    return (
      <section className={`list-section list-section--grid-4col ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container>
          <h2 className="list-section__title text-center mb-5">{section.name}</h2>
          {lists.map((list) => (
            <div key={list.id} className="list-section__container mb-5">
              {list.title && <h3 className="list-section__subtitle mb-4">{list.title}</h3>}
              <Row className="g-3">
                {list.cards?.map((card) => (
                  <Col key={card.id} xs={6} sm={6} md={3}>
                    <CardRenderer card={card} />
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </Container>
      </section>
    );
  }

  // Horizontal Scroll
  if (variantKey === LIST_VARIANTS.HORIZONTAL_SCROLL) {
    return (
      <section className={`list-section list-section--horizontal-scroll ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container fluid>
          <h2 className="list-section__title text-center mb-5">{section.name}</h2>
          {lists.map((list) => (
            <div key={list.id} className="list-section__container mb-5">
              {list.title && <h3 className="list-section__subtitle mb-4 px-3">{list.title}</h3>}
              <div className="list-section__scroll-wrapper">
                <div className="list-section__scroll-track">
                  {list.cards?.map((card) => (
                    <div key={card.id} className="list-section__scroll-item">
                      <CardRenderer card={card} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </Container>
      </section>
    );
  }

  // Vertical List
  if (variantKey === LIST_VARIANTS.VERTICAL_LIST) {
    return (
      <section className={`list-section list-section--vertical-list ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container>
          <h2 className="list-section__title text-center mb-5">{section.name}</h2>
          {lists.map((list) => (
            <div key={list.id} className="list-section__container mb-5">
              {list.title && <h3 className="list-section__subtitle mb-4">{list.title}</h3>}
              <div className="list-section__vertical">
                {list.cards?.map((card) => (
                  <div key={card.id} className="list-section__vertical-item mb-3">
                    <CardRenderer card={card} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Container>
      </section>
    );
  }

  // Featured Grid (large first card)
  if (variantKey === LIST_VARIANTS.FEATURED_GRID) {
    return (
      <section className={`list-section list-section--featured-grid ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container>
          <h2 className="list-section__title text-center mb-5">{section.name}</h2>
          {lists.map((list) => {
            const [firstCard, ...restCards] = list.cards || [];
            return (
              <div key={list.id} className="list-section__container mb-5">
                {list.title && <h3 className="list-section__subtitle mb-4">{list.title}</h3>}
                {firstCard && (
                  <Row className="g-4">
                    <Col xs={12} md={8}>
                      <CardRenderer card={firstCard} />
                    </Col>
                    <Col xs={12} md={4}>
                      <Row className="g-4">
                        {restCards.slice(0, 2).map((card) => (
                          <Col key={card.id} xs={12}>
                            <CardRenderer card={card} />
                          </Col>
                        ))}
                      </Row>
                    </Col>
                  </Row>
                )}
                {restCards.length > 2 && (
                  <Row className="g-4 mt-4">
                    {restCards.slice(2).map((card) => (
                      <Col key={card.id} xs={12} sm={6} md={4}>
                        <CardRenderer card={card} />
                      </Col>
                    ))}
                  </Row>
                )}
              </div>
            );
          })}
        </Container>
      </section>
    );
  }

  // Default: 3 Column Grid
  return (
    <section className={`list-section list-section--grid-3col ${section.is_active === false ? 'section-inactive' : ''}`}>
      <Container>
        <h2 className="list-section__title text-center mb-5">{section.name}</h2>
        {lists.map((list) => (
          <div key={list.id} className="list-section__container mb-5">
            {list.title && <h3 className="list-section__subtitle mb-4">{list.title}</h3>}
            <Row className="g-4">
              {list.cards?.map((card) => (
                <Col key={card.id} xs={12} sm={6} md={4}>
                  <CardRenderer card={card} />
                </Col>
              ))}
            </Row>
          </div>
        ))}
      </Container>
    </section>
  );
};

export default ListSectionPreset;
